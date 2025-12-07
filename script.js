// 全局变量：悬浮窗、折叠状态、选中的标签、当前角色
let floatWindow = null;
let isCollapsed = false;
// 预设标签库（可自定义扩展）
const TAG_CONFIG = {
  mood: [ // 心情标签
    { key: 'happy', name: '开心' },
    { key: 'angry', name: '生气' },
    { key: 'sad', name: '悲伤' },
    { key: 'calm', name: '平静' },
    { key: 'surprised', name: '惊讶' },
    { key: 'anxious', name: '焦虑' }
  ],
  trait: [ // 特质标签
    { key: 'outgoing', name: '外向' },
    { key: 'introverted', name: '内向' },
    { key: 'decisive', name: '果断' },
    { key: 'hesitant', name: '犹豫' },
    { key: 'gentle', name: '温柔' },
    { key: 'irritable', name: '暴躁' }
  ]
};
// 选中的标签（初始为空）
let selectedTags = {
  mood: [],
  trait: []
};

// 第一步：初始化预选悬浮面板
function initFloatWindow() {
  if (document.querySelector('.mood-trait-float')) return;

  floatWindow = document.createElement('div');
  floatWindow.className = 'mood-trait-float';
  // 构建标签选择面板
  floatWindow.innerHTML = `
    <div class="float-drag-handle">拖拽移动 | 特质/心情预选面板</div>
    <button class="float-collapse-btn">⊟</button>
    <div class="float-content">
      <div class="float-title">
        <span>为NPC选择特质/心情（AI生成前生效）</span>
      </div>
      
      <!-- 心情标签组 -->
      <div class="tag-group">
        <div class="tag-group-title">💢 心情</div>
        <div class="tag-list" id="mood-tags">
          ${TAG_CONFIG.mood.map(tag => `
            <button class="tag-btn" data-key="${tag.key}" data-type="mood">${tag.name}</button>
          `).join('')}
        </div>
      </div>

      <!-- 特质标签组 -->
      <div class="tag-group">
        <div class="tag-group-title">🧑‍🦰 特质</div>
        <div class="tag-list" id="trait-tags">
          ${TAG_CONFIG.trait.map(tag => `
            <button class="tag-btn" data-key="${tag.key}" data-type="trait">${tag.name}</button>
          `).join('')}
        </div>
      </div>

      <!-- 应用按钮 -->
      <button class="apply-btn" id="apply-tags">✅ 应用选中的标签（清空选则取消所有）</button>
    </div>
  `;
  document.body.appendChild(floatWindow);

  // 拖拽功能（同之前）
  makeDraggable(floatWindow);
  // 折叠功能（同之前）
  initCollapse();
  // 标签选择逻辑
  initTagClick();
  // 应用标签按钮逻辑
  initApplyBtn();
}

// 拖拽逻辑（复用之前的）
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const dragHandle = element.querySelector('.float-drag-handle');
  dragHandle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// 折叠逻辑
function initCollapse() {
  const collapseBtn = floatWindow.querySelector('.float-collapse-btn');
  collapseBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    const content = floatWindow.querySelector('.float-content');
    if (isCollapsed) {
      floatWindow.classList.add('float-collapsed');
      content.style.display = 'none';
      collapseBtn.textContent = '⊞';
    } else {
      floatWindow.classList.remove('float-collapsed');
      content.style.display = 'block';
      collapseBtn.textContent = '⊟';
    }
  });
}

// 标签点击选择/取消
function initTagClick() {
  // 监听所有标签按钮点击
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type; // mood/trait
      const key = btn.dataset.key;   // 标签key
      const isActive = btn.classList.contains('active');

      if (isActive) {
        // 取消选中：从数组中移除
        selectedTags[type] = selectedTags[type].filter(item => item !== key);
        btn.classList.remove('active');
      } else {
        // 选中：添加到数组（支持多选）
        selectedTags[type].push(key);
        btn.classList.add('active');
      }
    });
  });
}

// 应用标签按钮：清空/确认选中
function initApplyBtn() {
  const applyBtn = document.getElementById('apply-tags');
  applyBtn.addEventListener('click', () => {
    // 提示生效
    alert(`已应用标签：
    心情：${selectedTags.mood.map(key => TAG_CONFIG.mood.find(t => t.key === key)?.name).join('、') || '无'}
    特质：${selectedTags.trait.map(key => TAG_CONFIG.trait.find(t => t.key === key)?.name).join('、') || '无'}
    下一次AI生成会按此设定调整！`);
  });
}

// 核心：拦截AI请求，注入选中的标签到Prompt
function interceptAIPrompt() {
  // 保存原始的发送请求函数
  const originalSendPrompt = window.chatProcessor.sendPrompt;
  
  // 重写发送函数：注入标签
  window.chatProcessor.sendPrompt = async function(...args) {
    const prompt = args[0]; // 原始Prompt
    
    // 1. 把选中的标签转成自然语言描述
    const moodNames = selectedTags.mood.map(key => TAG_CONFIG.mood.find(t => t.key === key)?.name).filter(Boolean);
    const traitNames = selectedTags.trait.map(key => TAG_CONFIG.trait.find(t => t.key === key)?.name).filter(Boolean);
    
    // 2. 构建注入的提示语（放在Prompt开头，优先生效）
    let injectText = '';
    if (moodNames.length || traitNames.length) {
      injectText = `【强制要求】本次回复的NPC需符合以下设定：
      心情：${moodNames.join('、') || '无特殊心情'}；
      特质：${traitNames.join('、') || '无特殊特质'}；
      回复需自然融入上述设定，不生硬提及标签。
      `;
    }

    // 3. 拼接新Prompt（注入语 + 原始Prompt）
    const newPrompt = injectText + prompt;
    
    // 4. 调用原始函数发送新Prompt
    args[0] = newPrompt;
    return originalSendPrompt.apply(this, args);
  };
}

// 简化入口：直接初始化，不等待
initFloatWindow();
interceptAIPrompt();
console.log('✅ 插件已加载，悬浮窗已创建');

// 强制创建悬浮窗（确保一定会执行）
setTimeout(() => {
  // 如果悬浮窗还没创建，手动创建
  if (!document.querySelector('.mood-trait-float')) {
    initFloatWindow();
    console.log('⚠️ 强制创建悬浮窗成功');
  }
}, 2000); // 延迟2秒执行，确保页面加载完成
