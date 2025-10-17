const STORAGE_KEY = 'weekly-study-planner-v3';
const DAYS = [
  { key:'mon', label:'Monday' }, { key:'tue', label:'Tuesday' },
  { key:'wed', label:'Wednesday' }, { key:'thu', label:'Thursday' },
  { key:'fri', label:'Friday' }, { key:'sat', label:'Saturday' },
  { key:'sun', label:'Sunday' }
];
const colorChoices = ['#93c5fd','#fda4af','#bbf7d0','#fde68a','#c7d2fe','#fbcfe8','#fce7f3','#d1fae5'];
let state = loadState();

function defaultState(){ return { tasks:{}, order:{mon:[],tue:[],wed:[],thu:[],fri:[],sat:[],sun:[]} }; }
function loadState(){ try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):defaultState();}catch(e){return defaultState();}}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateProgress(); }

const boardEl=document.getElementById('board');
const modal=document.getElementById('modal');
const taskForm=document.getElementById('taskForm');
const newBtn=document.getElementById('newBtn');
const cancelBtn=document.getElementById('cancelBtn');
const titleInput=document.getElementById('title');
const subjectInput=document.getElementById('subject');
const notesInput=document.getElementById('notes');
const handoutsFile=document.getElementById('handoutsFile');
const daySelect=document.getElementById('daySelect');
const timeInput=document.getElementById('time');
const deadlineInput=document.getElementById('deadline');
const colorContainer=document.getElementById('colorContainer');
const searchInput=document.getElementById('search');
const clearBtn=document.getElementById('clearBtn');
const progressBar=document.getElementById('progressBar');
const progressLabel=document.getElementById('progressLabel');

newBtn.addEventListener('click', () => openModal('mon'));
let editingId=null, selectedColor=colorChoices[0];

function buildBoard(){
  boardEl.innerHTML='';
  for(const d of DAYS){
    const dayEl=document.createElement('div');
    dayEl.className='day';
    dayEl.dataset.day=d.key;
    dayEl.innerHTML=`<h3>${d.label} <button class="add-day-btn" data-day="${d.key}">+ add</button></h3><div class="tasks" id="col-${d.key}"></div>`;
    boardEl.appendChild(dayEl);
  }
  document.querySelectorAll('.add-day-btn').forEach(btn=>btn.addEventListener('click',()=>openModal(btn.dataset.day)));
}

function renderColorSwatches(){
  colorContainer.innerHTML='';
  for(const c of colorChoices){
    const sw=document.createElement('div');
    sw.className='color-swatch'; sw.style.background=c; sw.dataset.color=c;
    sw.onclick=()=>selectColor(c); colorContainer.appendChild(sw);
  }
}

function selectColor(c){
  selectedColor=c;
  document.querySelectorAll('.color-swatch').forEach(el=>{el.style.outline=(el.dataset.color===c)?'3px solid #0003':'none';});
}

function renderTasks(filter=''){
  for(const d of DAYS){
    const container=document.getElementById('col-'+d.key); container.innerHTML='';
    for(const id of state.order[d.key]){
      const t=state.tasks[id]; if(!t) continue;
      if(filter && ![t.title,t.subject,t.notes].join(' ').toLowerCase().includes(filter.toLowerCase())) continue;

      const overdue = t.deadline && new Date(t.deadline) < new Date() && !t.completed;
      const el=document.createElement('div');
      el.className='task'+(t.completed?' completed':'')+(overdue?' overdue':'');
      el.draggable=true; el.style.borderLeftColor=t.color;
      el.innerHTML=`
        <input type="checkbox" style="position:absolute;top:8px;right:8px;" ${t.completed?'checked':''} onchange="toggleComplete('${id}')">
        <h4>${t.title}</h4>
        <div class="meta">
          ${t.subject?`<span class="pill" style="background:${t.color}">${t.subject}</span>`:''}
          ${t.time?`<span>${t.time}</span>`:''}
          ${t.deadline?`<span>📅 ${t.deadline}</span>`:''}
        </div>
        <div class="actions">
          ${t.fileData?`<button class="small" onclick="viewHandouts('${id}')">View Handouts</button>`:''}
          <button class="small" onclick="editTask('${id}')">Edit</button>
          <button class="small" onclick="deleteTask('${id}')">Delete</button>
        </div>`;
      container.appendChild(el);
    }
  }
  updateProgress();
}

function updateProgress(){
  const all = Object.values(state.tasks);
  const done = all.filter(t=>t.completed).length;
  const total = all.length;
  const pct = total ? Math.round((done/total)*100) : 0;
  progressBar.style.width = pct+'%';
  progressLabel.textContent = `${pct}% completed`;
}

function openModal(day){ editingId=null; modal.style.display='flex'; taskForm.reset(); daySelect.value=day; selectColor(colorChoices[0]); }
function closeModal(){ modal.style.display='none'; editingId=null; }
cancelBtn.onclick=closeModal;

taskForm.onsubmit=(e)=>{
  e.preventDefault();
  const title=titleInput.value.trim(); if(!title) return alert('Title required');
  const subj=subjectInput.value.trim(), notes=notesInput.value.trim(), day=daySelect.value, time=timeInput.value, deadline=deadlineInput.value, color=selectedColor;
  if(editingId){
    const t=state.tasks[editingId]; Object.assign(t,{title,subject:subj,notes,day,time,deadline,color});
  } else {
    const id='t-'+Math.random().toString(36).slice(2,9);
    const t={id,title,subject:subj,notes,day,time,deadline,color,completed:false,fileData:null,fileName:null};
    const file=handoutsFile.files[0];
    if(file){ const reader=new FileReader(); reader.onload=()=>{t.fileData=reader.result;t.fileName=file.name;saveTask(t,day);}; reader.readAsDataURL(file); return; }
    saveTask(t,day);
  }
  saveState(); renderTasks(searchInput.value); closeModal();
};

function saveTask(task,day){
  state.tasks[task.id]=task;
  if(!state.order[day].includes(task.id)){for(const d of Object.keys(state.order))state.order[d]=state.order[d].filter(x=>x!==task.id);state.order[day].unshift(task.id);}
  saveState(); renderTasks(searchInput.value);
}

function editTask(id){
  const t=state.tasks[id]; if(!t)return; editingId=id; modal.style.display='flex';
  titleInput.value=t.title; subjectInput.value=t.subject; notesInput.value=t.notes;
  daySelect.value=t.day; timeInput.value=t.time; deadlineInput.value=t.deadline; selectColor(t.color||colorChoices[0]);
}

function deleteTask(id){ if(confirm('Delete this task?')){delete state.tasks[id];for(const d of Object.keys(state.order))state.order[d]=state.order[d].filter(x=>x!==id);saveState();renderTasks(searchInput.value);} }
function toggleComplete(id){ const t=state.tasks[id]; t.completed=!t.completed; saveState(); renderTasks(searchInput.value); }
window.editTask=editTask; window.deleteTask=deleteTask; window.toggleComplete=toggleComplete;

function viewHandouts(id){
  const t=state.tasks[id]; if(t.fileData){ const win=window.open(); win.document.write(`<title>${t.fileName}</title><iframe src="${t.fileData}" style="width:100%;height:100vh;border:none;"></iframe>`); }
}

searchInput.oninput=()=>renderTasks(searchInput.value);
clearBtn.onclick=()=>{if(confirm('Clear all?')){state=defaultState();saveState();renderTasks();}};
buildBoard(); renderColorSwatches(); selectColor(selectedColor); renderTasks();
modal.addEventListener('click',(e)=>{if(e.target===modal)closeModal();});
