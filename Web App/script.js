// Movie database with 6 placeholder entries, each containing 6 recommendation cards
const movieDatabase = {
    'the godfather': {
        recommendations: Array(6).fill({
            title: '$title',
            year: '$year',
            description: 'A $runtime minutes long $isadult $genre1, $genre2 movie, directed and written by $directors, $writers. Tags: $tags',
            rating: '$rating'
        })
    },
    'inception': {
        recommendations: Array(6).fill({
            title: '$title',
            year: '$year',
            description: 'A $runtime minutes long $isadult $genre1, $genre2 movie, directed and written by $directors, $writers. Tags: $tags',
            rating: '$rating'
        })
    },
    'pulp fiction': {
        recommendations: Array(6).fill({
            title: '$title',
            year: '$year',
            description: 'A $runtime minutes long $isadult $genre1, $genre2 movie, directed and written by $directors, $writers. Tags: $tags',
            rating: '$rating'
        })
    },
    'the dark knight': {
        recommendations: Array(6).fill({
            title: '$title',
            year: '$year',
            description: 'A $runtime minutes long $isadult $genre1, $genre2 movie, directed and written by $directors, $writers. Tags: $tags',
            rating: '$rating'
        })
    },
    'fight club': {
        recommendations: Array(6).fill({
            title: '$title',
            year: '$year',
            description: 'A $runtime minutes long $isadult $genre1, $genre2 movie, directed and written by $directors, $writers. Tags: $tags',
            rating: '$rating'
        })
    },
    'parasite': {
        recommendations: Array(6).fill({
            title: '$title',
            year: '$year',
            description: 'A $runtime minutes long $isadult $genre1, $genre2 movie, directed and written by $directors, $writers. Tags: $tags',
            rating: '$rating'
        })
    }
};

// Elements
const movieInput = document.getElementById('movieInput');
const searchBtn = document.getElementById('searchBtn');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const errorState = document.getElementById('errorState');
const recommendationsGrid = document.getElementById('recommendationsGrid');

// Event listeners
searchBtn.addEventListener('click', handleSearch);
movieInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

function handleSearch() {
    const movieName = movieInput.value.trim().toLowerCase();
    if (!movieName) {
        showError('Please enter a movie name');
        return;
    }
    hideAllStates();
    loadingState.classList.remove('hidden');
    // Simulated delay
    setTimeout(() => searchMovie(movieName), 1200);
}

function searchMovie(movieName) {
    const normalizedName = normalizeMovieName(movieName);
    const recommendations = movieDatabase[normalizedName];

    if (recommendations) {
        displayRecommendations(recommendations.recommendations);
    } else {
        const fuzzyMatch = fuzzySearchMovie(normalizedName);
        if (fuzzyMatch) {
            displayRecommendations(movieDatabase[fuzzyMatch].recommendations);
        } else {
            showError(`We couldn't find "${movieInput.value}". Try "Inception" or "Fight Club".`);
        }
    }
}

function normalizeMovieName(name) {
    return name.toLowerCase().replace(/^the\s+/i, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function fuzzySearchMovie(searchTerm) {
    const movies = Object.keys(movieDatabase);
    for (let movie of movies) {
        const normalizedMovie = normalizeMovieName(movie);
        if (normalizedMovie.includes(searchTerm) || searchTerm.includes(normalizedMovie)) return movie;
    }
    return null;
}

function displayRecommendations(movies) {
    hideAllStates();
    recommendationsGrid.innerHTML = '';

    // This now loops through all 6 placeholder cards
    movies.forEach((movie, index) => {
        recommendationsGrid.appendChild(createMovieCard(movie, index + 1));
    });

    resultsSection.classList.remove('hidden');
    setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

function createMovieCard(movie, number) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    card.innerHTML = `
        <div class="movie-number">${number}</div>
        <h3 class="movie-title">${movie.title}</h3>
        <p class="movie-year">Released: ${movie.year}</p>
        <p class="movie-description">${movie.description}</p>
        <span class="movie-rating">★ ${movie.rating}</span>
    `;

    return card;
}

function showError(message) {
    hideAllStates();
    errorState.querySelector('.error-text').textContent = message;
    errorState.classList.remove('hidden');
}

function hideAllStates() {
    loadingState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    errorState.classList.add('hidden');
}