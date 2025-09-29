/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import wordsData from './words.json';

function App() {
  const [currentWord, setCurrentWord] = useState(null);
  const [showKorean, setShowKorean] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [usedWords, setUsedWords] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSectionSelect, setShowSectionSelect] = useState(true);
  const [languageMode, setLanguageMode] = useState('korean'); // 'english', 'korean', 'mixed'
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechInput, setSpeechInput] = useState('');
  const recognitionRef = useRef(null);
  const [shortWordThreshold, setShortWordThreshold] = useState(0.4); // 1-2글자 단어 유사율
  const [longWordThreshold, setLongWordThreshold] = useState(0.6); // 3글자 이상 단어 유사율
  const [currentScore, setCurrentScore] = useState(0); // 현재 점수
  const [maxScore, setMaxScore] = useState(0); // 최대 점수 (총 문제 수)
  const [speechSupported, setSpeechSupported] = useState(true); // 음성인식 지원 여부
  const [userStartedSpeech, setUserStartedSpeech] = useState(false); // 사용자가 수동으로 음성인식 시작했는지
  const [showSettings, setShowSettings] = useState(false); // 설정 화면 표시 여부

  const getFilteredWords = useCallback(() => {
    if (selectedSection === 'all') {
      return wordsData;
    }
    return wordsData.filter(word => word.section === selectedSection);
  }, [selectedSection]);

  const getNextWord = useCallback(() => {
    const filteredWords = getFilteredWords();
    if (usedWords.length >= filteredWords.length) {
      setIsCompleted(true);
      return;
    }

    const availableWords = filteredWords.filter((_, index) => {
      const originalIndex = wordsData.indexOf(filteredWords[index]);
      return !usedWords.includes(originalIndex);
    });

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const word = availableWords[randomIndex];
    const wordIndex = wordsData.indexOf(word);

    const showKoreanFirst = true;

    setCurrentWord(word);
    setShowKorean(showKoreanFirst);
    setShowAnswer(false);
    setUsedWords([...usedWords, wordIndex]);
    setSpeechInput('');
    setIsListening(false);
    setUsedPreview(false); // 새 문제에서 미리보기 상태 초기화
    setPreviewedWords([]); // 미리보기한 단어 목록 초기화
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [usedWords, getFilteredWords]);


  const selectSection = useCallback((section) => {
    const filteredWords = section === 'all' ? wordsData : wordsData.filter(word => word.section === section);
    setSelectedSection(section);
    setShowSectionSelect(false);
    setUsedWords([]);
    setIsCompleted(false);
    setShowAnswer(false);
    setSpeechInput('');
    setIsListening(false);
    setCurrentScore(0);
    setMaxScore(filteredWords.length);
  }, []);

  const backToSectionSelect = useCallback(() => {
    setShowSectionSelect(true);
    setSelectedSection(null);
    setCurrentWord(null);
    setUsedWords([]);
    setIsCompleted(false);
    setShowAnswer(false);
    setSpeechInput('');
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const restartCurrentSection = useCallback(() => {
    if (selectedSection) {
      const filteredWords = selectedSection === 'all' ? wordsData : wordsData.filter(word => word.section === selectedSection);
      setUsedWords([]);
      setIsCompleted(false);
      setCurrentWord(null);
      setShowAnswer(false);
      setSpeechInput('');
      setIsListening(false);
      setCurrentScore(0);
      setMaxScore(filteredWords.length);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [selectedSection]);


  const handleKeyDown = useCallback((e) => {
    if (showSectionSelect) {
      return;
    }

    if (isCompleted && e.code === 'KeyR' && !isSpacePressed) {
      e.preventDefault();
      backToSectionSelect();
    } else if (!isCompleted) {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        if (!showAnswer) {
          setShowAnswer(true);
          setTimeout(() => {
            getNextWord();
          }, 1500);
        }
      }
    }
  }, [showAnswer, getNextWord, isCompleted, backToSectionSelect, showSectionSelect, isSpacePressed]);

  const handleKeyUp = useCallback((e) => {
    if (e.code === 'Space') {
      setIsSpacePressed(false);
    }
  }, []);

  useEffect(() => {
    if (!showSectionSelect && !isCompleted && usedWords.length === 0 && selectedSection) {
      getNextWord();
    }
  }, [getNextWord, isCompleted, usedWords.length, showSectionSelect, selectedSection]);

  const getSectionTitle = () => {
    if (selectedSection === 'all') return '전체';
    return `${selectedSection}과`;
  };

  // JSON 데이터에서 고유한 섹션 번호들을 추출
  const getAvailableSections = useCallback(() => {
    const sections = [...new Set(wordsData.map(item => item.section))].sort((a, b) => a - b);
    return sections;
  }, []);

  const getCurrentProgress = () => {
    const filteredWords = getFilteredWords();
    return { current: usedWords.length, total: filteredWords.length };
  };

  const calculateSimilarity = useCallback((str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }, []);

  const initSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('음성인식이 지원되지 않는 브라우저입니다.');
      setSpeechSupported(false);
      return;
    }
    setSpeechSupported(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = showKorean ? 'en-US' : 'ko-KR';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // 기존 speechInput과 새로운 결과를 누적
      setSpeechInput(prev => {
        const newInput = finalTranscript + interimTranscript;
        if (finalTranscript) {
          // 최종 결과가 있으면 기존 내용에 추가
          return (prev + ' ' + newInput).trim();
        } else {
          // 중간 결과만 있으면 기존 최종 결과 + 현재 중간 결과
          const existingFinal = prev.split(' ').filter(word => word.trim()).join(' ');
          return (existingFinal + ' ' + interimTranscript).trim();
        }
      });
    };

    recognition.onerror = (event) => {
      console.error('음성인식 오류:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [showKorean, currentWord, getNextWord, calculateSimilarity]);


  const levenshteinDistance = (str1, str2) => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  const startSpeechRecognition = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        if (error.name === 'InvalidStateError') {
          console.log('Speech recognition is already running');
        } else {
          console.error('Speech recognition error:', error);
        }
      }
    }
  }, [isListening]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // 약어 매핑 테이블
  const contractionMap = {
    "i'm": ["i", "am"],
    "you're": ["you", "are"],
    "he's": ["he", "is"],
    "she's": ["she", "is"],
    "it's": ["it", "is"],
    "we're": ["we", "are"],
    "they're": ["they", "are"],
    "i'll": ["i", "will"],
    "you'll": ["you", "will"],
    "he'll": ["he", "will"],
    "she'll": ["she", "will"],
    "it'll": ["it", "will"],
    "we'll": ["we", "will"],
    "they'll": ["they", "will"],
    "won't": ["will", "not"],
    "can't": ["can", "not"],
    "don't": ["do", "not"],
    "doesn't": ["does", "not"],
    "didn't": ["did", "not"],
    "isn't": ["is", "not"],
    "aren't": ["are", "not"],
    "wasn't": ["was", "not"],
    "weren't": ["were", "not"],
    "haven't": ["have", "not"],
    "hasn't": ["has", "not"],
    "hadn't": ["had", "not"],
    "shouldn't": ["should", "not"],
    "wouldn't": ["would", "not"],
    "couldn't": ["could", "not"]
  };

  // 숫자와 시간 표현을 위한 한국식 발음 매핑
  const numberTimeMap = {
    "9am": ["나인에이엠", "9에이엠", "나인am", "nine am", "나인 에이엠", "9 am"],
    "5:30am": ["파이브써티에이엠", "5:30에이엠", "파이브써티am", "five thirty am", "파이브 써티 에이엠", "5 30 am", "5:30 am"],
    "9": ["나인", "nine"],
    "5": ["파이브", "five"],
    "30": ["써티", "thirty"]
  };

  // 한글 발음과 영어 알파벳 매핑
  const koreanToEnglishMap = {
    "a": ["어", "에이", "아"]
  };

  // 숫자, 금액, 시간 등을 자동으로 보여줄 단어들 (정규식 패턴)
  const autoRevealPatterns = [
    /^\d+$/,           // 순수 숫자 (9, 30, 100 등)
    /^\d+am$/i,        // 시간 (9am, 12pm 등)
    /^\d+pm$/i,        // 시간 (9pm, 12pm 등)
    /^\d+:\d+$/,       // 시간 (5:30, 12:45 등)
    /^\d+:\d+am$/i,    // 시간 (5:30am, 12:45pm 등)
    /^\d+:\d+pm$/i,    // 시간 (5:30pm, 12:45pm 등)
    /^\$\d+/,          // 달러 ($100, $50 등)
    /^\d+\$$/,         // 달러 (100$, 50$ 등)
    /^\d+%$/,          // 퍼센트 (50%, 100% 등)
    /^\d+kg$/i,        // 무게 (5kg, 10kg 등)
    /^\d+cm$/i,        // 길이 (180cm, 170cm 등)
    /^\d+m$/i,         // 길이 (5m, 10m 등)
  ];

  // 단어가 자동으로 보여져야 하는지 확인하는 함수
  const shouldAutoReveal = useCallback((word) => {
    const cleanWord = word.replace(/[.,!?;"']/g, '').toLowerCase();
    return autoRevealPatterns.some(pattern => pattern.test(cleanWord));
  }, []);

  // 팝업 상태 관리
  const [showPopup, setShowPopup] = useState(false);
  const [popupWord, setPopupWord] = useState('');
  const [popupIndex, setPopupIndex] = useState(-1);
  const [usedPreview, setUsedPreview] = useState(false); // 미리보기 사용 여부
  const [previewedWords, setPreviewedWords] = useState([]); // 미리보기한 단어들의 인덱스

  // 힌트 팝업 상태 관리
  const [showHintPopup, setShowHintPopup] = useState(false);

  // 약어를 풀어쓰기로 변환하는 함수
  const expandContractions = useCallback((text) => {
    let expanded = text.toLowerCase();
    Object.entries(contractionMap).forEach(([contraction, expansion]) => {
      const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
      expanded = expanded.replace(regex, expansion.join(' '));
    });
    return expanded;
  }, []);

  // 풀어쓰기를 약어로 변환하는 함수 (역방향)
  const contractWords = useCallback((text) => {
    let contracted = text.toLowerCase();
    Object.entries(contractionMap).forEach(([contraction, expansion]) => {
      const expansionPattern = expansion.join('\\s+');
      const regex = new RegExp(`\\b${expansionPattern}\\b`, 'gi');
      contracted = contracted.replace(regex, contraction);
    });
    return contracted;
  }, []);

  // 사용자가 말한 단어들 중에서 정답과 일치하는 것들만 찾아서 반환
  const findMatchedWords = useCallback((speechText, correctAnswer) => {
    if (!correctAnswer) return [];

    const speechWords = speechText ? speechText.toLowerCase().split(/\s+/).filter(word => word.length > 0) : [];
    const originalWords = correctAnswer.split(/\s+/);
    const matchedWords = [];
    const usedSpeechWords = new Set(); // 이미 사용된 speechWord를 추적

    // 각 원본 단어에 대해 매칭 확인
    originalWords.forEach((originalWord, originalIndex) => {
      const cleanOriginalWord = originalWord.replace(/[.,!?;"']/g, '').toLowerCase();

      // 자동으로 보여지는 단어들은 자동으로 매칭된 것으로 처리
      if (shouldAutoReveal(originalWord)) {
        matchedWords.push({
          word: cleanOriginalWord,
          original: originalWord,
          originalWord: cleanOriginalWord,
          originalIndex: originalIndex
        });
        return;
      }

      // 사용자가 말한 각 단어와 비교 (아직 사용되지 않은 단어만)
      for (let i = 0; i < speechWords.length; i++) {
        if (usedSpeechWords.has(i)) continue; // 이미 사용된 단어는 건너뛰기

        const speechWord = speechWords[i];
        const cleanSpeech = speechWord.replace(/[.,!?;"']/g, '');
        let matched = false;

        // 1. 직접 일치 확인
        if (cleanSpeech === cleanOriginalWord) {
          if (!matchedWords.some(m => m.originalIndex === originalIndex)) {
            matchedWords.push({
              word: cleanOriginalWord,
              original: originalWord,
              originalWord: cleanOriginalWord,
              originalIndex: originalIndex
            });
            usedSpeechWords.add(i); // 사용된 speechWord 표시
            matched = true;
          }
        }

        // 2. 약어 확장해서 비교
        if (!matched && contractionMap[cleanOriginalWord]) {
          const expandedWords = contractionMap[cleanOriginalWord];
          if (expandedWords.includes(cleanSpeech)) {
            if (!matchedWords.some(m => m.originalIndex === originalIndex)) {
              matchedWords.push({
                word: cleanSpeech,
                original: originalWord,
                originalWord: cleanOriginalWord,
                originalIndex: originalIndex
              });
              usedSpeechWords.add(i);
              matched = true;
            }
          }
        }

        // 3. 역방향: 사용자가 약어를 말했을 때
        if (!matched && contractionMap[cleanSpeech]) {
          const expandedWords = contractionMap[cleanSpeech];
          if (expandedWords.includes(cleanOriginalWord)) {
            if (!matchedWords.some(m => m.originalIndex === originalIndex)) {
              matchedWords.push({
                word: cleanOriginalWord,
                original: originalWord,
                originalWord: cleanOriginalWord,
                originalIndex: originalIndex
              });
              usedSpeechWords.add(i);
              matched = true;
            }
          }
        }

        // 3.5. 숫자/시간 표현 매핑 확인
        if (!matched && numberTimeMap[cleanOriginalWord]) {
          const koreanPronunciations = numberTimeMap[cleanOriginalWord];
          // 사용자가 말한 내용이 한국식 발음 중 하나와 일치하는지 확인
          if (koreanPronunciations.some(pronunciation =>
            cleanSpeech.includes(pronunciation.replace(/\s+/g, '')) ||
            pronunciation.replace(/\s+/g, '').includes(cleanSpeech) ||
            cleanSpeech === pronunciation ||
            calculateSimilarity(cleanSpeech, pronunciation.replace(/\s+/g, '')) >= 0.7
          )) {
            if (!matchedWords.some(m => m.originalIndex === originalIndex)) {
              matchedWords.push({
                word: cleanOriginalWord,
                original: originalWord,
                originalWord: cleanOriginalWord,
                originalIndex: originalIndex
              });
              usedSpeechWords.add(i);
              matched = true;
            }
          }
        }

        // 3.7. 한글-영어 알파벳 매핑 확인
        if (!matched && koreanToEnglishMap[cleanOriginalWord]) {
          const koreanPronunciations = koreanToEnglishMap[cleanOriginalWord];
          // 사용자가 말한 내용이 한국어 발음 중 하나와 일치하는지 확인
          if (koreanPronunciations.some(pronunciation =>
            cleanSpeech === pronunciation ||
            calculateSimilarity(cleanSpeech, pronunciation) >= 0.8
          )) {
            if (!matchedWords.some(m => m.originalIndex === originalIndex)) {
              matchedWords.push({
                word: cleanOriginalWord,
                original: originalWord,
                originalWord: cleanOriginalWord,
                originalIndex: originalIndex
              });
              usedSpeechWords.add(i);
              matched = true;
            }
          }
        }

        // 4. 유사도 기준을 완화하여 한국인 발음 특성 고려
        if (!matched && cleanOriginalWord.length >= 3 && cleanSpeech.length >= 3) {
          const similarity = calculateSimilarity(cleanSpeech, cleanOriginalWord);
          if (similarity >= longWordThreshold) {
            if (!matchedWords.some(m => m.originalIndex === originalIndex)) {
              matchedWords.push({
                word: cleanOriginalWord,
                original: originalWord,
                originalWord: cleanOriginalWord,
                originalIndex: originalIndex
              });
              usedSpeechWords.add(i);
              matched = true;
            }
          }
        }

        // 5. 짧은 단어 (1-2글자)에 대한 특별 처리 - 한국인 발음 고려
        if (!matched && cleanOriginalWord.length <= 2) {
          const similarity = calculateSimilarity(cleanSpeech, cleanOriginalWord);
          if (similarity >= shortWordThreshold) { // 짧은 단어는 더 관대한 기준 적용
            if (!matchedWords.some(m => m.originalIndex === originalIndex)) {
              matchedWords.push({
                word: cleanOriginalWord,
                original: originalWord,
                originalWord: cleanOriginalWord,
                originalIndex: originalIndex
              });
              usedSpeechWords.add(i);
              matched = true;
            }
          }
        }

        // 매칭되었으면 다음 originalWord로 넘어가기
        if (matched) break;
      }
    });

    return matchedWords;
  }, [calculateSimilarity, shortWordThreshold, longWordThreshold]);

  // 텍스트 음성 합성 함수
  const speakWord = useCallback((word) => {
    if ('speechSynthesis' in window) {
      // 대문자를 소문자로 변환하여 자연스러운 발음
      const cleanWord = word.replace(/[.,!?;"']/g, '').toLowerCase();
      const utterance = new SpeechSynthesisUtterance(cleanWord);

      // 미국식 발음을 위한 설정
      utterance.lang = 'en-US';
      utterance.rate = 0.7; // 조금 더 천천히
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 사용 가능한 음성 중에서 미국식 영어 음성을 찾아서 설정
      const voices = speechSynthesis.getVoices();
      const preferredVoices = [
        'Microsoft David - English (United States)',
        'Microsoft Mark - English (United States)',
        'Microsoft Zira - English (United States)',
        'Google US English',
        'Alex',
        'Samantha'
      ];

      // 선호하는 음성 순서대로 찾기
      let selectedVoice = null;
      for (const preferredName of preferredVoices) {
        selectedVoice = voices.find(voice =>
          voice.name.includes(preferredName) ||
          (voice.lang === 'en-US' && voice.name.toLowerCase().includes(preferredName.toLowerCase()))
        );
        if (selectedVoice) break;
      }

      // 선호하는 음성이 없으면 en-US 중에서 첫 번째 선택
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'en-US');
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      speechSynthesis.speak(utterance);
    }
  }, []);

  // 팝업 열기 함수
  const openPopup = useCallback((word, index) => {
    setPopupWord(word);
    setPopupIndex(index);
    setShowPopup(true);
  }, []);

  // 팝업 닫기 함수 (미리보기 사용 표시)
  const closePopup = useCallback(() => {
    setShowPopup(false);
    if (popupIndex !== -1) {
      setPreviewedWords(prev => [...prev, popupIndex]); // 미리보기한 단어 인덱스 추가
      setUsedPreview(true); // 미리보기를 사용했다고 표시
    }
    setPopupWord('');
    setPopupIndex(-1);
  }, [popupIndex]);

  const renderAnswerWithBlanks = () => {
    if (!currentWord) return null;

    const correctAnswer = showKorean ? currentWord.english : currentWord.korean;
    const correctWords = correctAnswer.split(' ');

    // 정답 확인 후에는 전체 문장 표시
    if (showAnswer) {
      return (
        <div className="answer-blanks-container">
          {correctWords.map((word, index) => (
            <span
              key={index}
              className="answer-word revealed"
            >
              {word}
            </span>
          ))}
        </div>
      );
    }

    // 사용자가 말한 단어 중 정답과 일치하는 것들을 정답 순서대로 정렬하여 표시
    const matchedWords = findMatchedWords(speechInput, correctAnswer);

    return (
      <div className="answer-blanks-container">
        {correctWords.map((correctWord, index) => {
          const cleanCorrectWord = correctWord.replace(/[.,!?;"']/g, '').toLowerCase();

          // 원본 단어를 기준으로 매칭된 단어 찾기
          let matchedWord = matchedWords.find(m => m.originalWord === cleanCorrectWord);

          // 약어 처리: 원본 단어가 약어인 경우 풀어쓰기 단어들과도 매칭
          if (!matchedWord && contractionMap[cleanCorrectWord]) {
            const expandedWords = contractionMap[cleanCorrectWord];
            matchedWord = matchedWords.find(m => expandedWords.includes(m.word));
          }

          if (matchedWord) {
            return (
              <span
                key={index}
                className="answer-word matched"
              >
                {correctWord}
              </span>
            );
          } else if (shouldAutoReveal(correctWord)) {
            // 숫자, 금액, 시간 등은 자동으로 보여주기
            return (
              <span
                key={index}
                className="answer-word auto-revealed"
                onClick={() => speakWord(correctWord)}
                title="클릭하면 발음을 들을 수 있습니다"
              >
                {correctWord}
              </span>
            );
          } else if (previewedWords.includes(index)) {
            // 미리보기한 단어는 정답으로 표시 (미리보기 사용으로 인한 틀림 표시)
            return (
              <span
                key={index}
                className="answer-word previewed"
                onClick={() => speakWord(correctWord)}
                title="미리보기로 확인한 단어입니다"
              >
                {correctWord}
              </span>
            );
          } else {
            return (
              <span
                key={index}
                className="answer-word blank clickable"
                onClick={() => openPopup(correctWord, index)}
                title="클릭하면 답을 확인할 수 있습니다"
              >
                ___
              </span>
            );
          }
        })}
      </div>
    );
  };

  // 음성 합성 목록을 미리 로드
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // 음성 목록이 로드될 때까지 기다림
      const loadVoices = () => {
        speechSynthesis.getVoices();
      };

      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
      loadVoices();
    }
  }, []);

  // 모바일 디바이스 감지 함수
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  useEffect(() => {
    if (currentWord && !showSectionSelect) {
      initSpeechRecognition();
      // 사용자가 이미 수동으로 시작했거나 데스크톱에서는 자동 시작
      if (userStartedSpeech || !isMobileDevice()) {
        setTimeout(() => {
          startSpeechRecognition();
        }, 100);
      }
    }
  }, [currentWord, showKorean, initSpeechRecognition, showSectionSelect, startSpeechRecognition, userStartedSpeech]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // 모든 단어를 맞췄을 때 자동으로 다음 문제로 넘어가기
  useEffect(() => {
    if (!currentWord || showAnswer) return;

    const correctAnswer = showKorean ? currentWord.english : currentWord.korean;
    const words = correctAnswer.split(' ');
    const matchedWords = findMatchedWords(speechInput, correctAnswer);

    // 모든 단어가 맞았는지 확인
    const allWordsMatched = words.length > 0 && matchedWords.length === words.length;

    if (allWordsMatched) {
      // 미리보기를 사용하지 않은 경우에만 점수 증가
      if (!usedPreview) {
        setCurrentScore(prev => prev + 1);
      }
      setShowAnswer(true);
      setTimeout(() => {
        getNextWord();
      }, 1500);
    }
  }, [currentWord, speechInput, showAnswer, showKorean, findMatchedWords, getNextWord, usedPreview]);


  if (!currentWord && !isCompleted && !showSectionSelect) return <div>Loading...</div>;

  return (
    <div className="App">
      <header className="App-header">
{showSettings ? (
          <div className="settings-screen">
            <div className="settings-header">
              <h1>설정</h1>
              <button
                className="back-to-main-button"
                onClick={() => setShowSettings(false)}
              >
                ← 뒤로가기
              </button>
            </div>

            <div className="settings-content">
              <div className="similarity-settings">
                <h3>음성인식 유사도 설정</h3>
                <div className="similarity-controls">
                  <div className="similarity-control">
                    <label>1-2글자 단어 유사도: {Math.round(shortWordThreshold * 100)}%</label>
                    <input
                      type="range"
                      min="0.2"
                      max="0.8"
                      step="0.05"
                      value={shortWordThreshold}
                      onChange={(e) => setShortWordThreshold(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="similarity-control">
                    <label>3글자 이상 단어 유사도: {Math.round(longWordThreshold * 100)}%</label>
                    <input
                      type="range"
                      min="0.4"
                      max="0.9"
                      step="0.05"
                      value={longWordThreshold}
                      onChange={(e) => setLongWordThreshold(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="support-section">
                <h3>버그 및 기능개선 리포팅</h3>
                <button
                  className="kakao-chat-button"
                  onClick={() => window.open('https://open.kakao.com/o/sEpuWAUh', '_blank')}
                >
                  💬 카카오톡 오픈채팅방
                </button>
                <p className="support-description">
                  버그 신고나 기능 개선 제안이 있으시면 오픈채팅방으로 연락해주세요!
                </p>
              </div>

              <div className="signature-section">
                <div className="signature-container">
                  <img
                    src="/image/sign.png"
                    alt="Eden Signature"
                    className="signature-image"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : showSectionSelect ? (
          <div className="section-select-screen">
            <div className="main-header">
              <h1>Study</h1>
              <button
                className="settings-button"
                onClick={() => setShowSettings(true)}
              >
                ⚙️ 설정
              </button>
            </div>
            <h2>학습할 섹션을 선택하세요</h2>

            <div className="section-buttons">
              {getAvailableSections().map(sectionNumber => (
                <button
                  key={sectionNumber}
                  className="section-button"
                  onClick={() => selectSection(sectionNumber)}
                >
                  {sectionNumber}과
                  <span className="section-count">({wordsData.filter(w => w.section === sectionNumber).length}개)</span>
                </button>
              ))}
              <button
                className="section-button all-button"
                onClick={() => selectSection('all')}
              >
                전체
                <span className="section-count">({wordsData.length}개)</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {!isCompleted && (
              <div className="hint-button">
                <button onClick={() => setShowHintPopup(true)}>
                  💡 힌트
                </button>
              </div>
            )}

            <div className="back-button">
              <button onClick={backToSectionSelect}>
                ← 섹션 선택으로
              </button>
            </div>

            <div className="main-title">
              <h1>{getSectionTitle()} 문장 연습</h1>
            </div>

            {isCompleted ? (
              <div className="completion-screen">
                <div className="completion-message">
                  <h2>🎉 모든 문제를 완료했습니다! 🎉</h2>
                  <div className="score-display">
                    <h3>최종 점수</h3>
                    <div className="score-numbers">
                      <span className="current-score">{currentScore}</span>
                      <span className="score-separator"> / </span>
                      <span className="max-score">{maxScore}</span>
                    </div>
                    <div className="score-percentage">
                      ({Math.round((currentScore / maxScore) * 100)}%)
                    </div>
                  </div>
                  <p>총 {getCurrentProgress().total}개의 단어를 완료했습니다.</p>
                  <div className="completion-buttons">
                    <button
                      className="restart-section-button"
                      onClick={restartCurrentSection}
                    >
                      현재 섹션 다시 풀기
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="progress-info">
                  <p>진행: {getCurrentProgress().current} / {getCurrentProgress().total}</p>
                </div>

                <div className="word-display">
                  <h2>
                    {showKorean ? currentWord.korean : currentWord.english}
                  </h2>
                </div>


                <div className="speech-input-section">
                  {isListening ? (
                    <p className="speech-result listening-indicator">🎤 음성을 인식하고 있습니다...</p>
                  ) : speechInput ? (
                    <p className="speech-result">음성 입력: {speechInput}</p>
                  ) : (
                    <p className="speech-result placeholder">자동으로 음성인식이 시작됩니다. 답을 말해주세요!</p>
                  )}
                </div>

                <div className="answer-display-section">
                  {renderAnswerWithBlanks()}
                </div>

                <div className="voice-controls">
                  {speechSupported && (!userStartedSpeech && isMobileDevice()) && (
                    <button
                      className="mic-button"
                      onClick={() => {
                        setUserStartedSpeech(true);
                        startSpeechRecognition();
                      }}
                    >
                      🎤 음성인식 시작
                    </button>
                  )}
                  {speechSupported && userStartedSpeech && (
                    <button
                      className={`mic-button ${isListening ? 'listening' : ''}`}
                      onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
                    >
                      {isListening ? '🔴 음성인식 중지' : '🎤 음성인식 시작'}
                    </button>
                  )}
                  <button
                    className="answer-button"
                    onClick={() => {
                      if (!showAnswer) {
                        setShowAnswer(true);
                        setTimeout(() => {
                          getNextWord();
                        }, 1500);
                      }
                    }}
                  >
                    정답 확인
                  </button>
                </div>

                <div className="instructions">
                  {speechSupported ? (
                    <p>
                      {isMobileDevice() && !userStartedSpeech
                        ? '🎤 위의 "음성인식 시작" 버튼을 눌러 음성인식을 시작하세요'
                        : '🎤 음성 인식 중 입니다.'
                      }
                    </p>
                  ) : (
                    <p style={{color: '#f44336', fontSize: '0.9rem'}}>
                      ⚠️ 현재 브라우저에서는 음성인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.
                    </p>
                  )}
                  {isMobileDevice() && speechSupported && (
                    <p style={{color: '#61dafb', fontSize: '0.9rem', marginTop: '10px'}}>
                      📱 모바일에서는 보안상 사용자가 직접 음성인식을 시작해야 합니다.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* 정답 미리보기 팝업 */}
        {showPopup && (
          <div className="popup-overlay" onClick={closePopup}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <div className="popup-header">
                <h3>정답 미리보기</h3>
                <button className="popup-close" onClick={closePopup}>×</button>
              </div>
              <div className="popup-body">
                <div className="popup-word">{popupWord}</div>
                <div className="popup-actions">
                  <button
                    className="speak-button"
                    onClick={() => speakWord(popupWord)}
                  >
                    🔊 발음 듣기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 힌트 팝업 */}
        {showHintPopup && currentWord && (
          <div className="popup-overlay" onClick={() => setShowHintPopup(false)}>
            <div className="popup-content hint-popup" onClick={(e) => e.stopPropagation()}>
              <div className="popup-header">
                <h3>💡 힌트</h3>
                <button className="popup-close" onClick={() => setShowHintPopup(false)}>×</button>
              </div>
              <div className="popup-body">
                <div className="hint-content">
                  <div className="hint-label">
                    {showKorean ? "영어 힌트" : "한국어 힌트"}
                  </div>
                  <div className="hint-text">
                    {showKorean ? currentWord.en_hint : currentWord.kr_hint}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
