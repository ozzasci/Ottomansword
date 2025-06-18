// LocalStorage ve uygulama değişkenleri
let words = JSON.parse(localStorage.getItem('words') || '[]');
let notificationIntervals = new Map();
let notificationWordCount = parseInt(localStorage.getItem('notificationWordCount') || '0');
let learnedToday = parseInt(localStorage.getItem('learnedToday') || '0');
let dailyGoal = 10, quizStats = JSON.parse(localStorage.getItem('quizStats') || '{"correct":0,"total":0}'), quizData = { arr: [], idx: 0, mode: false }, audioQuizData = { arr: [], idx: 0 };
let flashcardIndex = 0, flashcardShowMeaning = false;

// Tema
function toggleTheme() {
  const html = document.documentElement;
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    localStorage.theme = 'light';
    document.getElementById('themeIcon').textContent = '🌙';
  } else {
    html.classList.add('dark');
    localStorage.theme = 'dark';
    document.getElementById('themeIcon').textContent = '☀️';
  }
}
if (localStorage.theme === 'dark') document.documentElement.classList.add('dark');

// Sayfada bölüm geçişi (mobil menü ve diğer bölümler için)
function showSection(id) {
  for (const sec of ['kelimeEkle', 'kelimeListesi', 'ayarlar', 'quiz', 'audioQuiz', 'flashcard']) {
    const el = document.getElementById(sec);
    if (el) {
      if (sec === id) {
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('fade-in'), 10);
      } else {
        el.classList.add('hidden');
        el.classList.remove('fade-in');
      }
    }
  }
  if (id === "flashcard" && typeof showFlashcardSection === "function") showFlashcardSection();
  if (id === "audioQuiz" && typeof showAudioQuizSection === "function") showAudioQuizSection();
}

// Kelime Ekleme
function addWord() {
  const word = document.getElementById('wordInput').value.trim();
  const interval = parseInt(document.getElementById('intervalInput').value.trim()) || 10000;
  if (word.length < 2) { showError("En az 2 karakter girin."); return; }
  if (isWordExists(word)) { showError("Bu kelime zaten var."); return; }
  words.push({ word: word, interval: interval });
  localStorage.setItem('words', JSON.stringify(words));
  document.getElementById('wordInput').value = '';
  document.getElementById('intervalInput').value = '';
  renderWords();
  showToast("Kelime eklendi!", "bg-green-600");
  badgeBounce();
  updateProgressBar();
}

// Dosya Yükleme ve Önizleme (CSV, XLSX, TXT, JSON)
function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) { showError("Bir dosya seçmelisiniz."); return; }
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: function (results) { previewFileData(results.data); }
    });
  } else if (ext === 'xlsx') {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const [headers, ...rows] = json;
      const dataArr = rows.filter(row => row[0] && row[0].toString().trim().length > 0)
        .map(row => ({ word: row[0] ? row[0].toString().trim() : "", meaning: row[1] ? row[1].toString().trim() : "" }));
      previewFileData(dataArr);
    };
    reader.readAsArrayBuffer(file);
  } else if (ext === 'txt') {
    const reader = new FileReader();
    reader.onload = function (e) {
      const lines = e.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const arr = lines.map(line => ({ word: line }));
      previewFileData(arr);
    };
    reader.readAsText(file);
  } else if (ext === 'json') {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        let json = JSON.parse(e.target.result);
        if (Array.isArray(json)) json = json.map(item => typeof item === "string" ? { word: item } : item);
        previewFileData(json);
      } catch (err) { showError("JSON dosyası okunamadı."); }
    };
    reader.readAsText(file);
  } else { showError("Desteklenmeyen dosya tipi."); }
}
function previewFileData(dataArr) {
  const previewBox = document.getElementById('filePreview');
  if (!Array.isArray(dataArr) || !dataArr.length) {
    previewBox.innerHTML = "<div class='text-red-500'>Dosyada eklenebilir kelime bulunamadı.</div>";
    previewBox.classList.remove('hidden'); return;
  }
  let html = "<div class='overflow-x-auto'><table class='min-w-full text-sm border'><tr><th>#</th><th>Kelime</th><th>Anlam</th></tr>";
  dataArr.forEach((item, i) => {
    html += `<tr><td>${i + 1}</td><td>${item.word || item.kelime || ''}</td><td>${item.meaning || item.anlam || ''}</td></tr>`;
  });
  html += "</table></div>";
  html += `<button class="btn btn-success mt-2" onclick="addWordsBatchFromPreview()">Kelime Listesini Ekle</button>`;
  previewBox.innerHTML = html;
  previewBox.classList.remove('hidden');
  window._previewDataArr = dataArr;
}
function addWordsBatchFromPreview() {
  if (!window._previewDataArr) return;
  addWordsBatch(window._previewDataArr);
  document.getElementById('filePreview').classList.add('hidden');
  window._previewDataArr = null;
}
// Toplu Kelime Ekleme
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
function isWordExists(word) {
  return words.some(w => w.word && w.word.toLowerCase() === word.toLowerCase());
}

// Kelime Listesi ve Filtreleme
function renderWords(search = '') {
  const ul = document.getElementById('wordList');
  search = (search || '').toLowerCase();
  let filtered = search ? words.filter(w => (w.word && w.word.toLowerCase().includes(search)) || (w.meaning && w.meaning.toLowerCase().includes(search))) : words;
  ul.innerHTML = filtered.map((w, i) => `
    <li class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded mb-1">
      <div class="flex flex-col min-w-0 flex-1">
        <span class="font-semibold truncate">${w.word}</span>
        <span class="text-xs text-gray-500 truncate">${w.meaning || ""}</span>
        <span class="text-xs">${w.note ? "Not: "+w.note : ""}</span>
      </div>
      <div class="flex items-center gap-2 ml-3">
        <button class="btn btn-outline" title="Favori" onclick="toggleFavorite(${i})">${w.favorite ? '⭐' : '☆'}</button>
        <button class="btn btn-outline" title="Öğrenildi" onclick="toggleLearned(${i})">${w.learned ? '✅' : '⬜'}</button>
        <button class="btn btn-danger" title="Sil" onclick="removeWord(${i})">🗑️</button>
      </div>
    </li>
  `).join('');
  document.getElementById('listBadge').textContent = words.length;
}
function filterWords() {
  renderWords(document.getElementById('wordSearch').value);
}
function removeWord(idx) {
  words.splice(idx, 1);
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

// Bildirimler
function showNotification(word, meaning, interval) {
  return setInterval(() => {
    let body = meaning ? `${word}: ${meaning}` : word;
    new Notification('Kelime Hatırlatıcı', { body: body, icon: 'https://via.placeholder.com/32' });
  }, interval);
}
function startNotifications(wordList) {
  stopAllNotifications();
  wordList.forEach(wordObj => {
    if (!('Notification' in window)) { alert('Tarayıcınız bildirimleri desteklemiyor!'); return; }
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
function stopAllNotifications() {
  notificationIntervals.forEach((intervalId) => clearInterval(intervalId));
  notificationIntervals.clear();
  showToast('Bildirimler durduruldu!', "bg-yellow-500");
}
function updateNotifications() {
  const notificationWordCountInput = document.getElementById('notificationWordCount');
  const newCount = parseInt(notificationWordCountInput.value) || 0;
  if (notificationWordCountInput.value && (isNaN(newCount) || newCount < 1)) { showError('Lütfen geçerli bir bildirim kelime sayısı girin!'); return; }
  if (words.length === 0) { showError('Önce kelime yükleyin!'); return; }
  notificationWordCount = newCount;
  localStorage.setItem('notificationWordCount', notificationWordCount);
  const selectedWords = getSelectedItems(words, notificationWordCount, 'random');
  startNotifications(selectedWords);
  hideError();
  showToast('Bildirimler başlatıldı!');
}
function getSelectedItems(array, count, method) {
  if (!count || count >= array.length) return array;
  if (method === 'first') return array.slice(0, count);
  if (method === 'last') return array.slice(-count);
  const shuffled = array.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Progress Bar ve Günlük Hedef
function updateProgressBar() {
  learnedToday = Math.min(learnedToday, dailyGoal);
  const percent = Math.min(100, Math.round(100 * learnedToday / dailyGoal));
  document.getElementById('progressBar').style.width = percent + "%";
  document.getElementById('progressText').textContent = `${learnedToday}/${dailyGoal}`;
}
function resetProgress() {
  learnedToday = 0;
  localStorage.setItem('learnedToday', learnedToday);
  updateProgressBar();
}

// Dışa Aktarım
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

// Quiz / Test Modu
function startQuiz() {
  if (words.length === 0) { showError('Önce kelime yükleyin!'); return; }
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
  if (quizData.idx >= quizData.arr.length) {
    closeQuizModal();
    showToast(`Quiz tamamlandı! Skor: ${quizStats.correct}/${quizData.arr.length}`, "bg-purple-600");
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
  if (answer && w.meaning && answer === w.meaning.trim().toLowerCase()) {
    quizStats.correct++;
    showToast("Doğru!", "bg-green-500");
  } else {
    showToast(`Yanlış! Doğru: ${w.meaning || "Tanımsız"}`, "bg-red-500");
  }
  localStorage.setItem('quizStats', JSON.stringify(quizStats));
  quizData.idx++;
  setTimeout(showQuizQuestion, 1000);
}
function openQuizModal(q) {
  document.getElementById('quizQuestion').textContent = q;
  document.getElementById('quizModal').classList.remove('hidden');
}
function closeQuizModal() {
  document.getElementById('quizModal').classList.add('hidden');
  document.getElementById('quizAnswer').value = '';
}

// Audio Quiz Modu
function showAudioQuizSection() { }
function startAudioQuiz() {
  if (words.length === 0) { showError('Önce kelime yükleyin!'); return; }
  audioQuizData.arr = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
  audioQuizData.idx = 0;
  showAudioQuizQuestion();
}
function showAudioQuizQuestion() {
  if (audioQuizData.idx >= audioQuizData.arr.length) {
    closeAudioQuizModal();
    showToast(`Sesli quiz tamamlandı!`, "bg-purple-600");
    return;
  }
  openAudioQuizModal();
  setTimeout(() => speakWord(audioQuizData.arr[audioQuizData.idx].word), 600);
}
function submitQuizAudioAnswer() {
  const w = audioQuizData.arr[audioQuizData.idx];
  const answer = document.getElementById('audioQuizAnswer').value.trim().toLowerCase();
  closeAudioQuizModal();
  if (answer && answer === w.word.trim().toLowerCase()) {
    showToast("Doğru!", "bg-green-500");
  } else {
    showToast(`Yanlış! Doğru: ${w.word}`, "bg-red-500");
  }
  audioQuizData.idx++;
  setTimeout(showAudioQuizQuestion, 1000);
}
function openAudioQuizModal() {
  document.getElementById('audioQuizModal').classList.remove('hidden');
}
function closeAudioQuizModal() {
  document.getElementById('audioQuizModal').classList.add('hidden');
  document.getElementById('audioQuizAnswer').value = '';
}

// Flashcard Modu
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
  updateProgressBar();
}
function addFlashcardNote() {
  if (!words.length) return;
  const note = prompt("Kelimeye not/örnek cümle ekle:", words[flashcardIndex].note || "");
  if (note !== null) {
    words[flashcardIndex].note = note;
    localStorage.setItem('words', JSON.stringify(words));
    renderFlashcard();
    showToast('Not kaydedildi!', 'bg-blue-600');
  }
}
function speakFlashcard() {
  if (!words.length) return;
  speakWord(words[flashcardIndex].word, flashcardShowMeaning ? words[flashcardIndex].meaning : "");
}

// Sesli Okuma
function speakWord(word, meaning) {
  if (!('speechSynthesis' in window)) {
    showError("Tarayıcınız sesli okuma desteklemiyor!");
    return;
  }
  const utter = new SpeechSynthesisUtterance(`${word} ${meaning ? ': ' + meaning : ''}`);
  window.speechSynthesis.speak(utter);
}

// Toast ve Error
function showToast(msg, extraClass = "") {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `fixed right-4 bottom-4 px-4 py-3 rounded shadow-lg z-50 bg-green-500 text-white opacity-100 pointer-events-auto transition ${extraClass}`;
  setTimeout(() => { toast.classList.add('opacity-0'); }, 2000);
}
function showError(msg) {
  const err = document.getElementById('error');
  err.textContent = msg;
  err.classList.remove('hidden');
}
function hideError() {
  document.getElementById('error').classList.add('hidden');
}
function badgeBounce() {
  const badge = document.getElementById('listBadge');
  if (badge) {
    badge.classList.add('animate-bounce');
    setTimeout(() => badge.classList.remove('animate-bounce'), 1000);
  }
}

// Sayfa Açılışı
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notificationWordCount').value = notificationWordCount || '';
  renderWords();
  showQuizStats();
  hideError();
  updateProgressBar();
  if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(err => { showError('Uygulama çevrimdışı desteği yüklenemedi.'); });
  }
});
