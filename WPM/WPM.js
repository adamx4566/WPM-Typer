const WORDS = (`the quick brown fox jumps over the lazy dog time people year way day man
    thing woman life child world school state family student group country problem hand part place case week company system program question work government
    number night point home water room mother area money story fact month lot right study book eye job word business issue side kind head house service
    friend line end long law car city community president team minute idea kid body information back parent face others level office door health person art
    war history party result change morning research girl guy moment air teacher force education foot boy age policy everything`).split(/\s+/);

    const textArea = document.getElementById('textArea');
    const input = document.getElementById('input');
    const generateBtn = document.getElementById('generate');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const resetBtn = document.getElementById('reset');
    const durationSelect = document.getElementById('duration');
    const wordsCountInput = document.getElementById('wordsCount');
    const difficultySelect = document.getElementById('difficulty');

    const timeEl = document.getElementById('time');
    const wpmEl = document.getElementById('wpm');
    const accEl = document.getElementById('acc');
    const correctWordsEl = document.getElementById('correctWords');
    const wrongWordsEl = document.getElementById('wrongWords');

    const historyBody = document.getElementById('historyBody');
    const historyEmpty = document.getElementById('historyEmpty');
    const clearHistoryBtn = document.getElementById('clearHistory');

    const STORAGE_KEY = 'wpm_history_v1';

    let targetWords = [];
    let timer = null;
    let startTime = null;
    let elapsed = 0;
    let running = false;

    function generateText(){
      const count = Math.max(15, Math.min(1000, parseInt(wordsCountInput.value) || 60));
      const difficulty = difficultySelect.value;
      let pool = WORDS.slice();
      if(difficulty === 'hard'){
        pool = pool.concat(['complexity','sophisticated','implementation','evaluation','consequence','contribute','emphasize','particular','circumstance','algorithm']);
      } else if(difficulty === 'easy'){
        pool = pool.concat(['and','is','in','it','to','you','we','can','but','if']);
      }
      targetWords = [];
      for(let i=0;i<count;i++){
        const w = pool[Math.floor(Math.random()*pool.length)];
        targetWords.push(w);
      }
      textArea.innerHTML = '';
      targetWords.forEach((w, i) =>{
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = w + (i < targetWords.length -1 ? ' ' : '');
        textArea.appendChild(span);
      });
      resetStats(false);
    }

    function resetStats(clearInput = true){
      clearInterval(timer);
      timer = null;
      running = false;
      startTime = null;
      elapsed = 0;
      if(clearInput) {
        input.value = '';
        input.disabled = true;
      }
      timeEl.textContent = formatTime(0);
      wpmEl.textContent = '0';
      accEl.textContent = '0%';
      correctWordsEl.textContent = '0';
      wrongWordsEl.textContent = '0';
      document.querySelectorAll('#textArea .word').forEach(sp => { sp.classList.remove('correct','wrong','current'); });
    }

    function formatTime(sec){
      const s = Math.floor(sec%60).toString().padStart(2,'0');
      const m = Math.floor(sec/60).toString().padStart(2,'0');
      return `${m}:${s}`;
    }

    function start(){
      if(targetWords.length === 0){ generateText(); }
      resetStats();
      input.disabled = false;
      input.focus();
      running = true;
      startTime = Date.now();
      const duration = parseInt(durationSelect.value,10);
      timer = setInterval(()=>{
        elapsed = Math.floor((Date.now() - startTime)/1000);
        timeEl.textContent = formatTime(Math.min(elapsed, duration));
        updateStats();
        if(elapsed >= duration){
          stop();
        }
      }, 200);
    }

    function stop(){
      if(!running) return;
      running = false;
      clearInterval(timer);
      timer = null;
      input.disabled = true;
      updateStats(true);
      saveResult();
      loadHistory();
    }

    function updateStats(final=false){
      const typedRaw = input.value.trim();
      const typedWords = typedRaw.length ? typedRaw.split(/\s+/) : [];
      const typedCount = typedWords.filter(Boolean).length;
      let correct = 0; let wrong = 0;
      for(let i=0;i<typedWords.length;i++){
        const target = targetWords[i] || '';
        if(typedWords[i] === target) correct++; else wrong++;
      }
      const spans = document.querySelectorAll('#textArea .word');
      spans.forEach((sp, idx)=>{
        sp.classList.remove('correct','wrong','current');
        if(idx < typedWords.length){
          if(typedWords[idx] === (targetWords[idx] || '')) sp.classList.add('correct');
          else sp.classList.add('wrong');
        }
        if(idx === typedWords.length) sp.classList.add('current');
      });
      correctWordsEl.textContent = correct;
      wrongWordsEl.textContent = wrong;
      let secondsElapsed;
      if(startTime) secondsElapsed = Math.max(1, Math.floor((Date.now() - startTime)/1000));
      else secondsElapsed = 0;
      const minutes = Math.max(1/60, secondsElapsed/60);
      const wpm = Math.round(typedCount / minutes);
      wpmEl.textContent = isFinite(wpm) ? wpm : 0;
      const accuracy = typedCount === 0 ? 0 : Math.round((correct / typedCount)*100);
      accEl.textContent = accuracy + '%';
      if(final){
        try{
          wpmEl.animate([{transform:'scale(1)'},{transform:'scale(1.08)'}],{duration:300,iterations:2, direction:'alternate'});
        }catch(e){}
      }
    }

    function saveResult(){
      const typedRaw = input.value.trim();
      const typedWords = typedRaw.length ? typedRaw.split(/\s+/) : [];
      const typedCount = typedWords.filter(Boolean).length;
      let correct = 0; let wrong = 0;
      for(let i=0;i<typedWords.length;i++){
        if(typedWords[i] === (targetWords[i] || '')) correct++; else wrong++;
      }
      let secondsElapsed = startTime ? Math.floor((Date.now() - startTime)/1000) : 0;
      secondsElapsed = Math.max(0, secondsElapsed);
      const minutes = Math.max(1/60, secondsElapsed/60);
      const wpm = Math.round(typedCount / minutes);
      const accuracy = typedCount === 0 ? 0 : Math.round((correct / typedCount)*100);
      const date = new Date().toLocaleString();
      const durationSetting = parseInt(durationSelect.value,10);
      const entry = {
        date,
        wpm: isFinite(wpm) ? wpm : 0,
        accuracy: accuracy + '%',
        correct,
        wrong,
        timeSeconds: secondsElapsed,
        targetWordsCount: targetWords.length,
        durationSetting
      };
      let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      history.unshift(entry);
      if(history.length > 200) history = history.slice(0,200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }

    function loadHistory(){
      historyBody.innerHTML = '';
      const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if(history.length === 0){
        historyEmpty.style.display = 'block';
        return;
      }
      historyEmpty.style.display = 'none';
      history.forEach(item=>{
        const tr = document.createElement('tr');
        const timeLabel = item.timeSeconds ? formatSeconds(item.timeSeconds) : '-';
        tr.innerHTML = `<td style="white-space:nowrap">${escapeHtml(item.date)}</td>
                        <td>${escapeHtml(String(item.wpm))}</td>
                        <td>${escapeHtml(String(item.accuracy))}</td>
                        <td>${escapeHtml(String(item.correct))} / ${escapeHtml(String(item.wrong))}</td>
                        <td>${escapeHtml(timeLabel)} (${escapeHtml(String(item.durationSetting))}s)</td>`;
        historyBody.appendChild(tr);
      });
    }

    function clearHistory(){
      if(!confirm('Clear test history?')) return;
      localStorage.removeItem(STORAGE_KEY);
      loadHistory();
    }

    function formatSeconds(sec){
      const m = Math.floor(sec/60);
      const s = sec % 60;
      return `${m}m ${s}s`;
    }
    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    generateBtn.addEventListener('click', ()=>{ generateText(); loadHistory(); });
    startBtn.addEventListener('click', ()=> start());
    stopBtn.addEventListener('click', ()=> stop());
    resetBtn.addEventListener('click', ()=> generateText());
    clearHistoryBtn.addEventListener('click', clearHistory);

    input.addEventListener('input', ()=>{ if(!running) return; updateStats(); });

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' && !running && document.activeElement !== input){
        e.preventDefault(); start();
      }
    });

    generateText();
    loadHistory();