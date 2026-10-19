import { upload } from '@vercel/blob/client';
import './style.css';

const $ = selector => document.querySelector(selector);
let allItems = [], visibleItems = [], filter = 'all', search = '', pageSize = 16, viewerIndex = 0;
let selectedFiles = [];
const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];
const MAX_SIZE = 100 * 1024 * 1024;
const basename = name => name.replace(/-[a-zA-Z0-9]{12,}(?=\.)/, '');

async function loadGallery() {
  let builtIn = [];
  try { builtIn = await (await fetch('/media.json')).json(); } catch(e) { console.error(e); }
  let uploaded = [];
  try {
    const r = await fetch('/api/media');
    if(r.ok){ const data = await r.json(); uploaded = data.items || []; if(data.setupRequired) showNotice('Жаңа файлдарды жүктеу үшін Vercel → Storage → Blob сақтау орнын қосыңыз. Дайын фотолар мен видеоларды қазір де көре аласыз.'); }
  } catch(e) { console.error(e); }
  allItems = [...uploaded.reverse(),...builtIn];
  updateGallery();
}
function showNotice(message){ $('#notice').textContent = message; $('#notice').hidden = false; }
function updateGallery(){
 const imageCount = allItems.filter(i => i.type==='image').length;
 const videoCount = allItems.length-imageCount;
 $('#statAll').textContent=allItems.length;
 $('#statPhotos').textContent=imageCount;
 $('#statVideos').textContent=videoCount;
 $('#countAll').textContent=allItems.length;
 $('#countImages').textContent=imageCount;
 $('#countVideos').textContent=videoCount;
 visibleItems = allItems.filter(item => (filter==='all'||item.type===filter)&&item.name.toLowerCase().includes(search));
 const grid=$('#galleryGrid');grid.replaceChildren();
 for (const [index,item] of visibleItems.slice(0,pageSize).entries()) {
   const card=document.createElement('button');card.className='media-card';card.type='button';card.title=item.name;card.setAttribute('aria-label',item.name+' ашу');
   const media = document.createElement(item.type==='video'?'video':'img');
   media.src=item.url;
   if(item.type==='image'){media.loading='lazy';media.alt=item.name;media.decoding='async';}
   else {media.preload='metadata';media.muted=true;media.playsInline=true;}
   card.append(media);
   if(item.type==='video'){ const play=document.createElement('span');play.className='play-icon';play.textContent='▶';card.append(play); }
   const meta=document.createElement('div');meta.className='card-meta';
   const name=document.createElement('span');name.className='card-name';name.textContent=basename(item.name);
   const pill=document.createElement('span');pill.className='card-pill';pill.textContent=item.type==='video'?'▶ Видео':'◈ Фото';
   meta.append(name,pill);card.append(meta);card.addEventListener('click',()=>openViewer(index));grid.append(card);
 }
 $('#emptyState').hidden=visibleItems.length!==0;
 $('#showMore').hidden=pageSize>=visibleItems.length;
}
document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click',()=>{filter=btn.dataset.filter;pageSize=16;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===btn));updateGallery();}));
$('#searchInput').addEventListener('input',e=>{search=e.target.value.toLowerCase().trim();pageSize=16;updateGallery();});
$('#showMore').addEventListener('click',()=>{pageSize+=16;updateGallery();});
const dialog=$('#uploadDialog');
['#topUpload','#heroUpload','#galleryUpload','#bottomUpload'].forEach(selector => $(selector).addEventListener('click',()=>dialog.showModal()));
const zone=$('#dropZone'), fileInput=$('#fileInput');
zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');setFiles([...e.dataTransfer.files]);});
fileInput.addEventListener('change',()=>setFiles([...fileInput.files]));
function setFiles(files){
 selectedFiles=files.filter(f=>allowed.includes(f.type)&&f.size<=MAX_SIZE);
 const invalid=files.length-selectedFiles.length;
 $('#fileSummary').hidden=!files.length;
 $('#fileSummary').textContent=selectedFiles.length+' файл таңдалды'+(invalid?' · '+invalid+' файл жарамсыз немесе 100 МБ-тан үлкен':'');
 $('#submitUpload').disabled=!selectedFiles.length;
 $('#uploadStatus').textContent='';
}
$('#submitUpload').addEventListener('click',async()=>{
 if(!selectedFiles.length)return;
 const button=$('#submitUpload');button.disabled=true;$('#uploadProgress').hidden=false;
 let completed=0, success=0;
 for(const file of selectedFiles){
   try {
    $('#uploadStatus').textContent=`Жүктелуде: ${completed+1}/${selectedFiles.length} — ${file.name}`;
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
    await upload('rolab/'+Date.now()+'-'+safeName,file,{
      access:'public',handleUploadUrl:'/api/upload',contentType:file.type,
      multipart:true,
      onUploadProgress:({percentage})=>{ $('#progressBar').style.width=((completed+percentage/100)/selectedFiles.length*100)+'%'; }
    });success++;
   }catch(err){console.error(err);$('#uploadStatus').textContent='Қате: '+(err.message||'Файл жүктелмеді');}
   completed++;$('#progressBar').style.width=(completed/selectedFiles.length*100)+'%';
 }
 if(success){$('#uploadStatus').textContent=`✅ ${success} файл жүктелді!`;await loadGallery();}
 if(success===selectedFiles.length){setTimeout(()=>{dialog.close();resetUpload();document.querySelector('#gallery').scrollIntoView({behavior:'smooth'});},950);}
 else button.disabled=false;
});
function resetUpload(){selectedFiles=[];fileInput.value='';$('#fileSummary').hidden=true;$('#uploadProgress').hidden=true;$('#progressBar').style.width='0';$('#uploadStatus').textContent='';$('#submitUpload').disabled=true;}
dialog.addEventListener('close',resetUpload);
const viewer=$('#viewerDialog');
function openViewer(index){viewerIndex=index;renderViewer();viewer.showModal();}
function renderViewer(){
 const item=visibleItems[viewerIndex];if(!item)return;
 const container=$('#viewerMedia');container.replaceChildren();
 const media=document.createElement(item.type==='video'?'video':'img');media.src=item.url;
 if(item.type==='video'){media.controls=true;media.autoplay=true;media.playsInline=true;}else media.alt=item.name;
 container.append(media);$('#viewerName').textContent=item.name;
 $('#viewerDownload').href=item.url;$('#viewerDownload').setAttribute('download',item.name);
}
function stepViewer(direction){viewerIndex=(viewerIndex+direction+visibleItems.length)%visibleItems.length;renderViewer();}
$('#viewerClose').addEventListener('click',()=>viewer.close());
$('#viewerPrev').addEventListener('click',()=>stepViewer(-1));
$('#viewerNext').addEventListener('click',()=>stepViewer(1));
viewer.addEventListener('close',()=>$('#viewerMedia').replaceChildren());
document.addEventListener('keydown',e=>{if(!viewer.open)return;if(e.key==='ArrowLeft')stepViewer(-1);if(e.key==='ArrowRight')stepViewer(1);});
loadGallery();
