/**
 * Splits a text into chunks of `maxLength` characters.
 * Useful for chunking document text before generating embeddings.
 */
export function chunkText(text: string, maxLength: number = 2000): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length + 1 > maxLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(" "));
        currentChunk = [];
        currentLength = 0;
      }
      // If a single word is overly long, split it by length
      if (word.length > maxLength) {
        chunks.push(word.substring(0, maxLength));
        continue;
      }
    }
    currentChunk.push(word);
    currentLength += word.length + 1;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
