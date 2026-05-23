const cache = {};

export async function loadLesson(unitId, lessonId) {
  const key = `${unitId}/${lessonId}`;
  if (cache[key]) return cache[key];

  const url = `${import.meta.env.BASE_URL}content/${unitId}/${lessonId}.json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur de chargement de la leçon : ${response.status}`);
    }
    const data = await response.json();
    cache[key] = data;
    return data;
  } catch (error) {
    console.error(`Failed to load lesson ${key}:`, error);
    throw new Error('Impossible de charger la leçon. Veuillez vérifier votre connexion internet.');
  }
}

export function clearCache() {
  Object.keys(cache).forEach(key => delete cache[key]);
}
