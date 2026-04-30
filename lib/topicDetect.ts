export function detectTopic(text: string): string {
  const lowerText = text.toLowerCase();
  
  const topicKeywords = {
    disease: ['rog', 'bimari', 'patta', 'daag', 'disease', 'pest', 'insect', 'yellowing', 'spots', 'fungus', 'kidde', 'kida'],
    weather: ['mausam', 'barish', 'weather', 'rain', 'temperature', 'taapman', 'tufan', 'storm', 'dhoop', 'hawa'],
    mandi: ['mandi', 'bhav', 'rate', 'price', 'bechna', 'sell', 'market', 'daam', 'kimat'],
    irrigation: ['sinchai', 'paani', 'water', 'irrigation', 'drip', 'sprinkler', 'naami', 'sukha'],
    schemes: ['yojana', 'scheme', 'sarkar', 'government', 'subsidy', 'loan', 'pm kisan', 'bima', 'insurance']
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return topic;
    }
  }

  return 'general';
}
