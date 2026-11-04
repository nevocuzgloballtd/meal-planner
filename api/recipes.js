export default async function handler(req, res) {
  const key = process.env.SPOONACULAR_KEY;
  if (!key) return res.status(500).json({ error: 'Recipe key is missing on the server.' });

  const { mode, q, id } = req.query;
  const base = 'https://api.spoonacular.com/recipes/';
  let url;

  if (mode === 'search' && q) {
    url = base + 'complexSearch?query=' + encodeURIComponent(q) +
      '&number=8&addRecipeInformation=true&apiKey=' + key;
  } else if (mode === 'ingredient' && q) {
    url = base + 'findByIngredients?ingredients=' + encodeURIComponent(q) +
      '&number=8&ranking=2&apiKey=' + key;
  } else if (mode === 'info' && id) {
    url = base + encodeURIComponent(id) + '/information?apiKey=' + key;
  } else {
    return res.status(400).json({ error: 'Bad request' });
  }

  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.message || 'Recipe service error.' });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Could not reach the recipe service.' });
  }
}
