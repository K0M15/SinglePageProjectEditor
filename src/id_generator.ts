export function generateId(): string {
	const bytes = new Uint8Array(12); // 12 bytes = 96 bits
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
	  .map(b => b.toString(16).padStart(2, '0')) // convert each byte to 2-digit hex
	  .join('');
}