export function euclideanDistance(pointA, pointB) {
  if (pointA.length !== pointB.length) {
    throw new Error("Points must have the same dimensions");
  }

  return Math.sqrt(
    pointA
      .map((coord, index) => Math.pow(coord - pointB[index], 2))
      .reduce((sum, squaredDiff) => sum + squaredDiff, 0)
  );
}

export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0; 
  }

  return dotProduct / (magnitudeA * magnitudeB);
}


export async function embedGemini(text, key, model="models/text-embedding-004") {
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${key}`

  if (key == null) {
    throw Error("No Gemini API key supplied.");
  } 
  
  const result = await fetch(url, {
    method:'POST',
    headers:{
      'Content-Type': 'application/json',
    },
    body:JSON.stringify(embeddingRequest(text))
  })

  return await result.json()
}

function embeddingRequest(text, model="models/text-embedding-004") {
  return {
    model,
    content: {
      parts: [ { text }]
    }
  }
}