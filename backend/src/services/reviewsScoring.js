function scoreReviews(rating, reviewCount) {
  const count = reviewCount || 0;
  let score;

  if (count === 0) score = 15;
  else if (count <= 10) score = 12;
  else if (count <= 50) score = 8;
  else if (count <= 150) score = 4;
  else score = 1;

  const notes = [];
  if (rating > 0 && rating < 3.5 && count > 10) {
    score -= 2;
    notes.push(`Low rating (${rating}) — reputation management angle`);
  }

  score = Math.max(0, Math.min(15, score));
  return { score, notes };
}

module.exports = { scoreReviews };
