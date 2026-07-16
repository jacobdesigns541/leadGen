// Low score = few/no reviews = underperforming = good lead signal.
// High score = many reviews with a strong rating = established, well-performing business.
function scoreReviews(rating, reviewCount) {
  const count = reviewCount || 0;
  let score;

  if (count === 0) score = 1;
  else if (count <= 10) score = 3;
  else if (count <= 50) score = 6;
  else if (count <= 150) score = 10;
  else score = 14;

  const notes = [];

  if (count >= 151 && rating > 4.5) {
    score = 15; // Top performer
    notes.push(`Top performer — ${rating} rating across ${count} reviews`);
  }

  if (rating > 0 && rating < 3.5) {
    score = Math.max(0, score - 2);
    notes.push(`Low rating (${rating}) — reputation management angle`);
  }

  score = Math.max(0, Math.min(15, score));
  return { score, notes };
}

module.exports = { scoreReviews };
