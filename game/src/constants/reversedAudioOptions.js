export const REVERSED_AUDIO_OPTIONS = [
    { 
      value: 'forward', 
      label: 'Forward', 
      hint: 'Play normally' 
    },
    { 
      value: 'reverse', 
      label: 'Reversed', 
      hint: reversedClipsCount > 0 ? `${reversedClipsCount} available` : 'No clips' 
    },
  ];