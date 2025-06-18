// --- GLOBAL STATE ---
let words = JSON.parse(localStorage.getItem('words')) || [];
let notificationIntervals = new Map();
let notificationWordCount = parseInt(localStorage.getItem('notificationWordCount')) || 0;
let dailyGoal = 10;
let learnedToday = parseInt(localStorage.getItem('learnedToday')) || 0;
let quizStats = JSON.parse(localStorage.getItem('quizStats')) || { correct: 0, total: 0 };
let quizData = { idx: 0, arr: [], mode: false };
let audioQuizData = { idx: 0, arr: [] };

// --- TOAST ---
function showToast(msg, color="bg-green-500") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `fixed right-4 bottom-4 text-white px-4 py-3 rounded shadow-lg transition z-50 ${color} opacity-100`;
  toast.style.pointerEvents = "auto";
  setTimeout(()=>toast.classList.add("opacity-0"), 2500);
}

// --- ERROR HANDLING ---
function showError(msg) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
}
function hideError() {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = '';
  errorDiv.classList.add('hidden');
}

// --- WORDS ---
function isWordExists(word) {
  return words.some(w => w.word && w.word.toLowerCase() === word.toLowerCase());
}
function addWord() {
  const wordInput = document.getElementById('wordInput');
  const intervalInput = document.getElementById('intervalInput');
  const word = wordInput.value.trim();
  const interval = parseInt(intervalInput.value) * 1000;
  if (!word || isNaN(interval) || interval < 5000) {
    showError('Lütfen bir kelime ve en az 5 saniyelik bir süre girin!');
    return;
  }
  if (isWordExists(word)) {
    showError('Bu kelime zaten listede!');
    return;
  }
  words.push({ word, interval });
  localStorage.setItem('words', JSON.stringify(words));
  renderWords();
  wordInput.value = '';
  intervalInput.value = '';
  learnedToday += 1;
  localStorage.setItem('learnedToday', learnedToday);
  updateProgressBar();
  hideError();
  showToast('Kelime eklendi!');
  badgeBounce();
}

// --- BOUNCE BADGE ---
function badgeBounce() {
  const badge = document.getElementById('listBadge');
  if (badge) {
    badge.classList.add('bounce');
    setTimeout(()=>badge.classList.remove('bounce'),250);
  }
}

// --- LIST RENDERING ---
function renderWords(filter="") {
  const wordList = document.getElementById('wordList');
  let filtered = words;
  if(filter) {
    filtered = words.filter(w=> 
      w.word.toLowerCase().includes(filter.toLowerCase()) ||
      (w.meaning && w.meaning.toLowerCase().includes(filter.toLowerCase()))
    );
  }
  wordList.innerHTML = filtered.map((w,i) => `
    <li class="flex items-center justify-between group bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm px-3 py-2 rounded-lg transition fade-in">
      <div>
        <span class="font-bold text-blue-700 dark:text-blue-300">${w.word}</span>
        ${w.meaning ? `<span class="mx-2 text-gray-600 dark:text-gray-300">-</span><span class="italic text-purple-600 dark:text-purple-300">${w.meaning}</span>` : ""}
        ${w.learned ? `<span class="inline-block bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-semibold ml-2">Öğrenildi</span>` : ""}
        ${w.favorite ? `<span class="inline-block bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold ml-2">★ Favori</span>` : ""}
        ${w.note ? `<span class="block text-xs text-gray-500 mt-1">Not: ${w.note}</span>` : ""}
      </div>
      <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <button title="Sesli oku" onclick="speakWord('${w.word.replace(/'/g,"\\'")}', '${(w.meaning||"").replace(/'/g,"\\'")}')" class="text-blue-500 hover:text-blue-700 text-lg">🔊</button>
        <button title="Favori" onclick="toggleFavorite(${i})" class="${w.favorite?'text-yellow-400':'text-gray-400 hover:text-yellow-500'} text-lg">★</button>
        <button title="Öğrenildi" onclick="toggleLearned(${i})" class="${w.learned?'text-green-500':'text-gray-400 hover:text-green-500'} text-lg">✔️</button>
        <button title="Sil" onclick="removeWord(${i})" class="text-red-400 hover:text-red-700 text-lg">🗑️</button>
      </div>
    </li>
  `).join('');
  document.getElementById('listBadge').textContent = words.length;
  document.getElementById('flashcardBadge').textContent = words.length;
}

// --- FAVORİ & ÖĞRENİLDİ ---
function toggleFavorite(idx) {
  words[idx].favorite = !words[idx].favorite;
  localStorage.setItem('words', JSON.stringify(words));
  renderWords(document.getElementById('wordSearch').value);
  showToast(words[idx].favorite ? "Favorilere eklendi!" : "Favoriden çıkarıldı!", "bg-yellow-500");
}
function toggleLearned(idx) {
  words[idx].learned = !words[idx].learned;
  localStorage.setItem('words', JSON.stringify(words));
  renderWords(document.getElementById('wordSearch').value);
  showToast(words[idx].learned ? "Öğrenildi olarak işaretlendi!" : "Öğrenildi kaldırıldı!", "bg-green-600");
}

// --- SİLME ---
function removeWord(idx) {
  words.splice(idx,1);
  localStorage.setItem('words', JSON.stringify(words));
  renderWords(document.getElementById('wordSearch').value);
  showToast('Kelime silindi!', "bg-red-500");
  badgeBounce();
  updateProgressBar();
}
function clearAllWords() {
  words = [];
  localStorage.setItem('words', JSON.stringify(words));
  renderWords();
  showToast('Tüm kelimeler silindi!', "bg-red-500");
  badgeBounce();
  updateProgressBar();
}

// --- FİLTRELEME ---
function filterWords() {
  renderWords(document.getElementById('wordSearch').value);
}

// --- Dosya Yükleme ---
function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) {
    showError("Bir dosya seçmelisiniz.");
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const lines = e.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      addWordsBatch(lines);
    };
    reader.readAsText(file);
  } else if (ext === 'json') {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const json = JSON.parse(e.target.result);
        let kelimeler = [];
        if (Array.isArray(json)) {
          kelimeler = kelimelerFromArray(json);
        } else {
          Object.keys(json).forEach(mainKey => {
            const val = json[mainKey];
            if (Array.isArray(val)) {
              kelimeler = kelimeler.concat(kelimelerFromArray(val));
            }
          });
        }
        if (kelimeler.length === 0) {
          showError("JSON dosya formatı geçersiz veya uygun kelime bulunamadı.");
        } else {
          addWordsBatch(kelimeler);
        }
      } catch (err) {
        showError("JSON dosyası okunamadı.");
      }
    };
    reader.readAsText(file);
  } else {
    showError("Desteklenmeyen dosya tipi.");
  }
}
function kelimelerFromArray(arr) {
  const result = [];
  arr.forEach(obj => {
    if (typeof obj === "string") {
      result.push(obj);
    } else if (typeof obj === "object" && obj !== null) {
      let word = obj.kelime || obj.phrase || obj.isim || obj.osmanlica || obj.tekil || obj["İsm-i Fâil"] || obj.word || obj["çoğul"];
      let meaning = obj.anlam || obj.meaning || obj.turkce || obj.masdar || obj["Masdar"];
      if (word) {
        result.push({ word, meaning });
      } else {
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === "string") {
            result.push({ word: obj[key] });
          }
        });
      }
    }
  });
  return result;
}
function addWordsBatch(kelimeler) {
  let newWords = 0;
  kelimeler.forEach(kelime => {
    if (typeof kelime === "string") {
      let text = kelime.trim();
      if (text.length < 2) return;
      if (!isWordExists(text)) {
        words.push({ word: text, interval: 10000 });
        newWords++;
      }
    } else if (typeof kelime === "object" && kelime !== null) {
      let text = kelime.word ? kelime.word.trim() : "";
      let meaning = kelime.meaning ? kelime.meaning.trim() : "";
      if (text.length < 2) return;
      if (!isWordExists(text)) {
        let entry = { word: text, interval: 10000 };
        if (meaning) entry.meaning = meaning;
        words.push(entry);
        newWords++;
      }
    }
  });
  localStorage.setItem('words', JSON.stringify(words));
  renderWords();
  showToast(`${newWords} yeni kelime eklendi!`);
  badgeBounce();
  updateProgressBar();
}

// --- SESLİ OKUMA ---
function speakWord(word, meaning) {
  if (!('speechSynthesis' in window)) {
    showError("Tarayıcınız sesli okuma desteklemiyor!");
    return;
  }
  const utter = new SpeechSynthesisUtterance(`${word} ${meaning ? ': ' + meaning : ''}`);
  window.speechSynthesis.speak(utter);
}

// --- PROGRESS BAR ---
function updateProgressBar() {
  learnedToday = Math.min(learnedToday, dailyGoal);
  const percent = Math.min(100, Math.round(100*learnedToday/dailyGoal));
  document.getElementById('progressBar').style.width = percent + "%";
  document.getElementById('progressText').textContent = `${learnedToday}/${dailyGoal}`;
}
function resetProgress() {
  learnedToday = 0;
  localStorage.setItem('learnedToday', learnedToday);
  updateProgressBar();
}

// --- BİLDİRİMLER ---
function showNotification(word, meaning, interval) {
  return setInterval(() => {
    let body = meaning ? `${word}: ${meaning}` : word;
    new Notification('Kelime Hatırlatıcı', {
      body: body,
      icon: 'https://via.placeholder.com/32'
    });
  }, interval);
}
function startNotifications(wordList) {
  stopAllNotifications();
  wordList.forEach(wordObj => {
    if (!('Notification' in window)) {
      alert('Tarayıcınız bildirimleri desteklemiyor!');
      return;
    }
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const intervalId = showNotification(wordObj.word, wordObj.meaning, wordObj.interval);
          notificationIntervals.set(wordObj.word, intervalId);
        } else {
          alert('Bildirim izni verilmedi, alert kullanılacak.');
          const intervalId = setInterval(() => alert(`Hatırlatma: ${wordObj.word}${wordObj.meaning ? ' - ' + wordObj.meaning : ''}`), wordObj.interval);
          notificationIntervals.set(wordObj.word, intervalId);
        }
      });
    } else {
      const intervalId = showNotification(wordObj.word, wordObj.meaning, wordObj.interval);
      notificationIntervals.set(wordObj.word, intervalId);
    }
  });
}
function getSelectedItems(array, count, method) {
  if (!count || count >= array.length) return array;
  if (method === 'first') return array.slice(0, count);
  if (method === 'last')  return array.slice(-count);
  const shuffled = array.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
function stopAllNotifications() {
  notificationIntervals.forEach((intervalId) => clearInterval(intervalId));
  notificationIntervals.clear();
  showToast('Bildirimler durduruldu!', "bg-yellow-500");
}
function updateNotifications() {
  const notificationWordCountInput = document.getElementById('notificationWordCount');
  const newCount = parseInt(notificationWordCountInput.value) || 0;
  if (notificationWordCountInput.value && (isNaN(newCount) || newCount < 1)) {
    showError('Lütfen geçerli bir bildirim kelime sayısı girin!');
    return;
  }
  if (words.length === 0) {
    showError('Önce kelime yükleyin!');
    return;
  }
  notificationWordCount = newCount;
  localStorage.setItem('notificationWordCount', notificationWordCount);
  const selectedWords = getSelectedItems(words, notificationWordCount, 'random');
  startNotifications(selectedWords);
  hideError();
  showToast('Bildirimler başlatıldı!');
}

// --- DIŞA AKTARIM ---
function exportWordsAsJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "kelimeler.json");
  document.body.appendChild(dlAnchorElem);
  dlAnchorElem.click();
  document.body.removeChild(dlAnchorElem);
  showToast('JSON dışa aktarıldı!', "bg-blue-500");
}

// --- QUIZ / TEST MODU ---
function startQuiz() {
  if (words.length === 0) {
    showError('Önce kelime yükleyin!');
    return;
  }
  quizData.arr = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
  quizData.idx = 0;
  quizData.mode = true;
  quizStats.total++;
  localStorage.setItem('quizStats', JSON.stringify(quizStats));
  showQuizStats();
  showQuizQuestion();
}
function showQuizStats() {
  document.getElementById('quizStats').innerHTML = `
    <div class="flex gap-4">
      <span class="inline-block bg-green-200 text-green-900 text-xs px-2 py-1 rounded font-semibold">Doğru: ${quizStats.correct}</span>
      <span class="inline-block bg-blue-200 text-blue-900 text-xs px-2 py-1 rounded font-semibold">Toplam Quiz: ${quizStats.total}</span>
    </div>
  `;
}
function showQuizQuestion() {
  if(quizData.idx >= quizData.arr.length) {
    closeQuizModal();
    showToast(`Quiz tamamlandı! Skor: ${quizStats.correct}/${quizData.arr.length}`,"bg-purple-600");
    showQuizStats();
    return;
  }
  const w = quizData.arr[quizData.idx];
  openQuizModal(`"${w.word}" kelimesinin anlamı nedir?`);
}
function submitQuizAnswer() {
  const w = quizData.arr[quizData.idx];
  const answer = document.getElementById('quizAnswer').value.trim().toLowerCase();
  closeQuizModal();
  if(answer && w.meaning && answer === w.meaning.trim().toLowerCase()) {
    quizStats.correct++;
    showToast("Doğru!","bg-green-500");
  } else {
    showToast(`Yanlış! Doğru: ${w.meaning || "Tanımsız"}`,"bg-red-500");
  }
  localStorage.setItem('quizStats', JSON.stringify(quizStats));
  quizData.idx++;
  setTimeout(showQuizQuestion, 1000);
}

// --- AUDIO QUIZ MODU ---
function showAudioQuizSection() { /* placeholder for any future render logic */ }
function startAudioQuiz() {
  if (words.length === 0) {
    showError('Önce kelime yükleyin!');
    return;
  }
  audioQuizData.arr = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
  audioQuizData.idx = 0;
  showAudioQuizQuestion();
}
function showAudioQuizQuestion() {
  if(audioQuizData.idx >= audioQuizData.arr.length) {
    closeAudioQuizModal();
    showToast(`Sesli quiz tamamlandı!`,"bg-purple-600");
    return;
  }
  openAudioQuizModal();
  setTimeout(()=>speakWord(audioQuizData.arr[audioQuizData.idx].word), 600);
}
function submitQuizAudioAnswer() {
  const w = audioQuizData.arr[audioQuizData.idx];
  const answer = document.getElementById('audioQuizAnswer').value.trim().toLowerCase();
  closeAudioQuizModal();
  if(answer && answer === w.word.trim().toLowerCase()) {
    showToast("Doğru!","bg-green-500");
  } else {
    showToast(`Yanlış! Doğru: ${w.word}`,"bg-red-500");
  }
  audioQuizData.idx++;
  setTimeout(showAudioQuizQuestion, 1000);
}

// --- FLASHCARD MODU ---
let flashcardIndex = 0;
let flashcardShowMeaning = false;
function showFlashcardSection() {
  renderFlashcard();
  document.getElementById('flashcardBadge').textContent = words.length;
}
function renderFlashcard() {
  const box = document.getElementById('flashcardBox');
  if (!words.length) {
    box.innerHTML = `<div class="text-center text-gray-400">Hiç kelime yok!</div>`;
    return;
  }
  const w = words[flashcardIndex];
  box.innerHTML = `
    <div class="relative w-72 h-40 cursor-pointer rounded-2xl shadow-lg bg-gradient-to-br from-blue-100 to-purple-200 dark:from-gray-700 dark:to-gray-800 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105"
         onclick="toggleFlashcard()">
      <div class="text-2xl font-bold mb-2">${flashcardShowMeaning ? (w.meaning || "<i>Anlam eklenmemiş</i>") : w.word}</div>
      <div class="text-sm text-gray-500 dark:text-gray-300">${w.note ? "Not: " + w.note : "&nbsp;"}</div>
      <div class="absolute top-2 right-3 text-xs px-2 py-1 rounded-full ${w.learned ? "bg-green-400 text-white" : "bg-gray-200 text-gray-600"}">${w.learned ? "Öğrenildi" : "Öğrenilmedi"}</div>
    </div>
  `;
}
function nextFlashcard() {
  if (!words.length) return;
  flashcardIndex = (flashcardIndex + 1) % words.length;
  flashcardShowMeaning = false;
  renderFlashcard();
}
function prevFlashcard() {
  if (!words.length) return;
  flashcardIndex = (flashcardIndex - 1 + words.length) % words.length;
  flashcardShowMeaning = false;
  renderFlashcard();
}
function toggleFlashcard() {
  flashcardShowMeaning = !flashcardShowMeaning;
  renderFlashcard();
}
function markLearned() {
  if (!words.length) return;
  words[flashcardIndex].learned = true;
  localStorage.setItem('words', JSON.stringify(words));
  renderFlashcard();
  showToast('Kelimeni öğrendin!','bg-green-600');
}
function addFlashcardNote() {
  if (!words.length) return;
  const note = prompt("Kelimeye not/örnek cümle ekle:", words[flashcardIndex].note || "");
  if (note !== null) {
    words[flashcardIndex].note = note;
    localStorage.setItem('words', JSON.stringify(words));
    renderFlashcard();
    showToast('Not kaydedildi!','bg-blue-600');
  }
}
function speakFlashcard() {
  if (!words.length) return;
  speakWord(words[flashcardIndex].word, flashcardShowMeaning ? words[flashcardIndex].meaning : "");
}

// --- SAYFA AÇILIŞI ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notificationWordCount').value = notificationWordCount || '';
  renderWords();
  showQuizStats();
  hideError();
  updateProgressBar();
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      showError('Uygulama çevrimdışı desteği yüklenemedi.');
    });
  }
});