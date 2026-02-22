// ═══════════════════════════════════════════════════════════════════════
// CineMatch — Content-Based Movie Recommendation Engine
// Loads precomputed TF-IDF cosine similarity data from movie_data.json
// ═══════════════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────────────
let movieData = null;           // { movies: [...], similarity: [...] }
let titleIndex = [];            // [{lowerTitle, idx}] for fast search
let currentSimilarList = [];    // full sorted similar-movie list for current selection
let expandedOffset = 0;         // how many movies loaded in expanded list
const TOP_CARDS = 6;            // initial recommendation grid count
const EXPAND_BATCH = 10;        // how many to load per scroll batch
const AUTOCOMPLETE_MAX = 5;     // max autocomplete suggestions

// ── DOM Elements ──────────────────────────────────────────────────────
const movieInput = document.getElementById('movieInput');
const searchBtn = document.getElementById('searchBtn');
const loadingState = document.getElementById('loadingState');
const dataLoadingState = document.getElementById('dataLoadingState');
const resultsSection = document.getElementById('resultsSection');
const errorState = document.getElementById('errorState');
const recommendationsGrid = document.getElementById('recommendationsGrid');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
const searchedMovieInfo = document.getElementById('searchedMovieInfo');
const expandBtn = document.getElementById('expandBtn');
const expandSection = document.getElementById('expandSection');
const expandedList = document.getElementById('expandedList');
const expandedMovies = document.getElementById('expandedMovies');
const scrollLoader = document.getElementById('scrollLoader');
const endOfList = document.getElementById('endOfList');

// ── Load Data ─────────────────────────────────────────────────────────
async function loadMovieData() {
    try {
        const response = await fetch('movie_data.json');
        if (!response.ok) throw new Error('Failed to load movie data');
        movieData = await response.json();

        // Build a title lookup index for fast autocomplete
        titleIndex = movieData.movies.map((m, idx) => ({
            lower: m.title.toLowerCase(),
            idx
        }));

        dataLoadingState.classList.add('hidden');
        movieInput.disabled = false;
        searchBtn.disabled = false;
        movieInput.focus();
    } catch (err) {
        dataLoadingState.querySelector('.data-loading-text').textContent =
            'Failed to load movie database. Please ensure movie_data.json exists.';
        dataLoadingState.querySelector('.data-loading-spinner').style.display = 'none';
        console.error(err);
    }
}

// Disable inputs until data loads
movieInput.disabled = true;
searchBtn.disabled = true;
loadMovieData();

// ── Event Listeners ───────────────────────────────────────────────────
searchBtn.addEventListener('click', handleSearch);
movieInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        autocompleteDropdown.classList.add('hidden');
        handleSearch();
    }
});

movieInput.addEventListener('input', handleAutocomplete);
movieInput.addEventListener('focus', handleAutocomplete);

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-with-autocomplete')) {
        autocompleteDropdown.classList.add('hidden');
    }
});

// Infinite scroll on the expanded list
window.addEventListener('scroll', handleInfiniteScroll);

// Expand button
expandBtn.addEventListener('click', toggleExpand);

// ── Autocomplete ──────────────────────────────────────────────────────
function handleAutocomplete() {
    const query = movieInput.value.trim().toLowerCase();
    if (!query || query.length < 2 || !movieData) {
        autocompleteDropdown.classList.add('hidden');
        return;
    }

    // Find movies whose title contains the query
    const matches = [];
    for (const entry of titleIndex) {
        if (entry.lower.includes(query)) {
            matches.push(entry);
            if (matches.length >= AUTOCOMPLETE_MAX) break;
        }
    }

    if (matches.length === 0) {
        autocompleteDropdown.classList.add('hidden');
        return;
    }

    autocompleteDropdown.innerHTML = '';
    matches.forEach(match => {
        const movie = movieData.movies[match.idx];
        const item = document.createElement('div');
        item.className = 'autocomplete-item';

        // Highlight the matching part
        const lowerTitle = movie.title.toLowerCase();
        const matchStart = lowerTitle.indexOf(query);
        const before = movie.title.substring(0, matchStart);
        const matched = movie.title.substring(matchStart, matchStart + query.length);
        const after = movie.title.substring(matchStart + query.length);

        item.innerHTML = `
            <span class="autocomplete-title">${before}<strong>${matched}</strong>${after}</span>
            <span class="autocomplete-meta">${movie.year || '—'} · ${movie.genres.split(',').slice(0, 2).join(', ')}</span>
        `;

        item.addEventListener('click', () => {
            movieInput.value = movie.title;
            autocompleteDropdown.classList.add('hidden');
            performSearch(match.idx);
        });

        autocompleteDropdown.appendChild(item);
    });

    autocompleteDropdown.classList.remove('hidden');
}

// ── Search ────────────────────────────────────────────────────────────
function handleSearch() {
    const query = movieInput.value.trim().toLowerCase();
    if (!query) {
        showError('Please enter a movie name');
        return;
    }
    if (!movieData) {
        showError('Movie database is still loading. Please wait.');
        return;
    }

    // Find exact or best match
    const exactMatch = titleIndex.find(e => e.lower === query);
    if (exactMatch) {
        hideAllStates();
        loadingState.classList.remove('hidden');
        setTimeout(() => performSearch(exactMatch.idx), 800);
        return;
    }

    // Fuzzy: find title that contains the query
    const partialMatch = titleIndex.find(e => e.lower.includes(query));
    if (partialMatch) {
        hideAllStates();
        loadingState.classList.remove('hidden');
        setTimeout(() => performSearch(partialMatch.idx), 800);
        return;
    }

    showError(`We couldn't find "${movieInput.value}" in our database of ${movieData.movies.length.toLocaleString()} movies. Try a different title.`);
}

function performSearch(movieIndex) {
    const movie = movieData.movies[movieIndex];
    const simList = movieData.similarity[movieIndex]; // [[idx, score], ...]

    // Store for infinite scroll
    currentSimilarList = simList;
    expandedOffset = 0;

    // Update input to show the exact matched title
    movieInput.value = movie.title;

    hideAllStates();

    // Show info about the searched movie
    renderSearchedMovieInfo(movie);

    // Display top 6 as cards
    recommendationsGrid.innerHTML = '';
    const topMovies = simList.slice(0, TOP_CARDS);
    topMovies.forEach(([idx, score], i) => {
        const rec = movieData.movies[idx];
        recommendationsGrid.appendChild(createMovieCard(rec, i + 1, score));
    });

    // Reset expanded section
    expandedMovies.innerHTML = '';
    expandedList.classList.add('hidden');
    expandSection.classList.remove('hidden');
    expandBtn.querySelector('.expand-btn-text').textContent = 'Show More Recommendations';
    expandBtn.querySelector('.expand-btn-icon').textContent = '⌄';
    endOfList.classList.add('hidden');
    scrollLoader.classList.add('hidden');
    expandedOffset = TOP_CARDS;

    resultsSection.classList.remove('hidden');
    setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

// ── Tag truncation helper ─────────────────────────────────────────────
function truncateTags(tagsStr, maxTags = 5) {
    if (!tagsStr) return '';
    const tagList = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length <= maxTags) return tagList.join(', ');
    return tagList.slice(0, maxTags).join(', ') + ` +${tagList.length - maxTags} more`;
}

// ── Render searched movie info ────────────────────────────────────────
function renderSearchedMovieInfo(movie) {
    const adultLabel = movie.isAdult ? 'Adult' : '';
    const runtimeStr = movie.runtime ? `${movie.runtime} min` : '';
    const genreStr = movie.genres.replace(/,/g, ', ');

    searchedMovieInfo.innerHTML = `
        <div class="searched-movie-card">
            <h3 class="searched-movie-title">${movie.title}</h3>
            <div class="searched-movie-details">
                ${movie.year ? `<span class="searched-meta">${movie.year}</span>` : ''}
                ${runtimeStr ? `<span class="searched-meta">${runtimeStr}</span>` : ''}
                ${movie.rating ? `<span class="searched-meta">★ ${movie.rating}</span>` : ''}
                ${adultLabel ? `<span class="searched-meta adult-label">${adultLabel}</span>` : ''}
            </div>
            <div class="searched-movie-genres">${genreStr}</div>
            ${movie.directors ? `<p class="searched-movie-crew"><strong>Director:</strong> ${movie.directors}</p>` : ''}
            ${movie.writers ? `<p class="searched-movie-crew"><strong>Writer:</strong> ${movie.writers}</p>` : ''}
            ${movie.tags ? `<p class="searched-movie-tags"><strong>Tags:</strong> ${truncateTags(movie.tags, 6)}</p>` : ''}
        </div>
    `;
}

// ── Create movie card (grid) ──────────────────────────────────────────
function createMovieCard(movie, number, score) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const genreStr = movie.genres.replace(/,/g, ', ');
    const runtimeStr = movie.runtime ? `${movie.runtime} min` : 'N/A';
    const adultStr = movie.isAdult ? ' · Adult' : '';
    const similarityPct = (score * 100).toFixed(1);

    let descParts = [];
    if (runtimeStr !== 'N/A') descParts.push(runtimeStr);
    if (genreStr) descParts.push(genreStr);
    if (adultStr) descParts.push(adultStr.replace(' · ', ''));

    let crewLine = '';
    if (movie.directors) crewLine += `Directed by ${movie.directors}`;
    if (movie.writers) {
        if (crewLine) crewLine += ' · ';
        crewLine += `Written by ${movie.writers}`;
    }

    let tagsLine = movie.tags ? `Tags: ${truncateTags(movie.tags, 5)}` : '';

    card.innerHTML = `
        <div class="movie-number">${number}</div>
        <div class="similarity-badge">${similarityPct}% match</div>
        <h3 class="movie-title">${movie.title}</h3>
        <p class="movie-year">Released: ${movie.year || 'N/A'}</p>
        <p class="movie-description">${descParts.join(' · ')}</p>
        ${crewLine ? `<p class="movie-crew">${crewLine}</p>` : ''}
        ${tagsLine ? `<p class="movie-tags">${tagsLine}</p>` : ''}
        <span class="movie-rating">★ ${movie.rating || 'N/A'}</span>
    `;

    return card;
}

// ── Expand / Infinite Scroll ──────────────────────────────────────────
function toggleExpand() {
    if (expandedList.classList.contains('hidden')) {
        expandedList.classList.remove('hidden');
        expandBtn.querySelector('.expand-btn-text').textContent = 'Hide Extra Recommendations';
        expandBtn.querySelector('.expand-btn-icon').textContent = '⌃';
        loadMoreMovies();
        setTimeout(() => expandedList.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } else {
        expandedList.classList.add('hidden');
        expandBtn.querySelector('.expand-btn-text').textContent = 'Show More Recommendations';
        expandBtn.querySelector('.expand-btn-icon').textContent = '⌄';
    }
}

function loadMoreMovies() {
    if (expandedOffset >= currentSimilarList.length) {
        scrollLoader.classList.add('hidden');
        endOfList.classList.remove('hidden');
        return;
    }

    scrollLoader.classList.remove('hidden');

    // Simulate a slight delay for smoothness
    setTimeout(() => {
        const batch = currentSimilarList.slice(expandedOffset, expandedOffset + EXPAND_BATCH);
        batch.forEach(([idx, score], i) => {
            const movie = movieData.movies[idx];
            const rank = expandedOffset + i + 1;
            expandedMovies.appendChild(createExpandedMovieItem(movie, rank, score));
        });

        expandedOffset += batch.length;
        scrollLoader.classList.add('hidden');

        if (expandedOffset >= currentSimilarList.length) {
            endOfList.classList.remove('hidden');
        }
    }, 300);
}

function createExpandedMovieItem(movie, rank, score) {
    const item = document.createElement('div');
    item.className = 'expanded-movie-item';

    const genreStr = movie.genres.replace(/,/g, ', ');
    const similarityPct = (score * 100).toFixed(1);
    const runtimeStr = movie.runtime ? `${movie.runtime} min` : '';

    let metaParts = [];
    if (movie.year) metaParts.push(movie.year);
    if (runtimeStr) metaParts.push(runtimeStr);
    if (movie.rating) metaParts.push(`★ ${movie.rating}`);

    item.innerHTML = `
        <div class="expanded-item-rank">${rank}</div>
        <div class="expanded-item-content">
            <div class="expanded-item-header">
                <h4 class="expanded-item-title">${movie.title}</h4>
                <span class="expanded-item-match">${similarityPct}%</span>
            </div>
            <p class="expanded-item-meta">${metaParts.join(' · ')}</p>
            ${genreStr ? `<p class="expanded-item-genres">${genreStr}</p>` : ''}
            ${movie.directors ? `<p class="expanded-item-crew">Dir: ${movie.directors}</p>` : ''}
            ${movie.tags ? `<p class="expanded-item-tags">${truncateTags(movie.tags, 8)}</p>` : ''}
        </div>
    `;

    return item;
}

function handleInfiniteScroll() {
    if (expandedList.classList.contains('hidden')) return;
    if (expandedOffset >= currentSimilarList.length) return;
    if (!scrollLoader.classList.contains('hidden')) return; // already loading

    const threshold = 200;
    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;

    if (docHeight - scrollBottom < threshold) {
        loadMoreMovies();
    }
}

// ── Utility ───────────────────────────────────────────────────────────
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