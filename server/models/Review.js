// ------------------------------
// reviews.js — Frontend
// ------------------------------
const reviewsContainer = document.getElementById('reviews-container');
const reviewForm = document.getElementById('review-form');
const productId = new URLSearchParams(window.location.search).get('id');

console.log('reviews.js loaded, productId =', productId);

if (!reviewsContainer) console.warn('No #reviews-container found!');
if (!reviewForm) console.warn('No #review-form found!');

async function fetchReviews() {
    if (!productId) return console.warn('No productId in URL, cannot fetch reviews.');
    
    try {
        const res = await fetch(`/api/reviews/${productId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reviews = await res.json();
        console.log('Fetched reviews:', reviews);
        renderReviews(reviews);
    } catch (err) {
        console.error('Failed to fetch reviews:', err);
    }
}

function renderReviews(reviews) {
    if (!reviewsContainer) return;
    reviewsContainer.innerHTML = '';

    if (!reviews.length) {
        reviewsContainer.textContent = 'No reviews yet. Be the first to review!';
        return;
    }

    reviews.forEach(r => {
        const div = document.createElement('div');
        div.className = 'review';
        div.innerHTML = `
            <strong>${r.name}</strong> — ${r.rating}/5<br>
            <em>${new Date(r.date).toLocaleString()}</em>
            <p>${r.text}</p>
        `;
        reviewsContainer.appendChild(div);
    });
}

if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!productId) return console.warn('No productId, cannot submit review.');

        const formData = new FormData(reviewForm);
        const reviewData = {
            productId,
            name: formData.get('name'),
            rating: Number(formData.get('rating')),
            text: formData.get('text')
        };

        console.log('Submitting review:', reviewData);

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewData)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            console.log('Review saved:', result);
            reviewForm.reset();
            fetchReviews(); // refresh reviews after submission
        } catch (err) {
            console.error('Failed to submit review:', err);
        }
    });
}

// Initial fetch
fetchReviews();