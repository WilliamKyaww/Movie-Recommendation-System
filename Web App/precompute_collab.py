"""
Precompute collaborative filtering movie similarity for the CineMatch web app.

Uses TruncatedSVD on the user-item rating matrix to derive movie latent factors,
then computes cosine similarity between movies in latent space.

Output: collab_data.json — a mapping from tconst → list of [tconst, score] pairs
representing the top-N most similar movies by collaborative signal.
"""

import os
import json
import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

# ── Paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
RATINGS_FILE = os.path.join(PROJECT_DIR, "Cleaned Datasets", "Audience_Ratings.csv")
MOVIES_FILE = os.path.join(PROJECT_DIR, "Cleaned Datasets", "Final_Movie_Data.tsv")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "collab_data.json")

TOP_N_SIMILAR = 50   # How many similar movies to store per movie
N_COMPONENTS = 50    # SVD latent dimensions
MIN_RATINGS = 5      # Minimum ratings for a user/movie to be included
BATCH_SIZE = 500     # Cosine similarity batch size

# ── 1. Load ratings data ──────────────────────────────────────────────
print("Loading ratings data...")
df_ratings = pd.read_csv(RATINGS_FILE)
print(f"  Loaded {len(df_ratings)} ratings")

# ── 2. Load movie data to know which tconst IDs we care about ─────────
print("Loading movie data for tconst mapping...")
df_movies = pd.read_csv(MOVIES_FILE, delimiter="\t", usecols=["tconst"])
# Convert tconst (e.g. "tt0114709") to integer imdbId (e.g. 114709)
df_movies["imdbId"] = df_movies["tconst"].str.replace("tt", "", regex=False).astype(int)
content_imdb_ids = set(df_movies["imdbId"].values)
print(f"  Content-based movie set: {len(content_imdb_ids)} movies")

# ── 3. Filter ratings ─────────────────────────────────────────────────
print("Filtering ratings (min_user_ratings=5, min_movie_ratings=5)...")
user_counts = df_ratings["userId"].value_counts()
movie_counts = df_ratings["imdbId"].value_counts()

df = df_ratings[df_ratings["userId"].isin(user_counts[user_counts >= MIN_RATINGS].index)]
df = df[df["imdbId"].isin(movie_counts[movie_counts >= MIN_RATINGS].index)]

# Also filter to only movies that exist in our content-based set
df = df[df["imdbId"].isin(content_imdb_ids)]

print(f"  After filtering: {len(df)} ratings, "
      f"{df['userId'].nunique()} users, {df['imdbId'].nunique()} movies")

# ── 4. Build sparse user-item matrix ──────────────────────────────────
print("Building sparse user-item matrix...")
user_ids = df["userId"].unique()
movie_ids = df["imdbId"].unique()

user2idx = {uid: i for i, uid in enumerate(user_ids)}
movie2idx = {mid: i for i, mid in enumerate(movie_ids)}
idx2movie = {i: mid for mid, i in movie2idx.items()}

n_users = len(user_ids)
n_movies = len(movie_ids)
print(f"  Matrix size: {n_users} users × {n_movies} movies")

row_indices = df["userId"].map(user2idx).values
col_indices = df["imdbId"].map(movie2idx).values
ratings = df["rating"].values.astype(np.float32)

user_item_matrix = csr_matrix((ratings, (row_indices, col_indices)),
                              shape=(n_users, n_movies))

# ── 5. TruncatedSVD ───────────────────────────────────────────────────
print(f"Running TruncatedSVD with {N_COMPONENTS} components...")
svd = TruncatedSVD(n_components=N_COMPONENTS, random_state=42)
# Transpose so movies are rows: item-feature matrix
item_features = svd.fit_transform(user_item_matrix.T)  # shape: (n_movies, N_COMPONENTS)
print(f"  Explained variance ratio (sum): {svd.explained_variance_ratio_.sum():.4f}")

# Normalize for cosine similarity
item_features = normalize(item_features, axis=1)

# ── 6. Build tconst->index mapping for the content-based movie list ────
# We need to output similarity in terms of the content-based movie index
# (the position in movie_data.json), not in terms of collaborative matrix indices.
print("Building tconst -> content-index mapping...")
# Reload full movie list to get the ordering matching movie_data.json
df_movies_full = pd.read_csv(MOVIES_FILE, delimiter="\t", usecols=["tconst"])
tconst_to_content_idx = {}
for content_idx, row in df_movies_full.iterrows():
    tconst_to_content_idx[row["tconst"]] = content_idx

# Build imdbId → content_idx mapping
imdb_to_content_idx = {}
for tconst, cidx in tconst_to_content_idx.items():
    imdb_id = int(tconst.replace("tt", ""))
    imdb_to_content_idx[imdb_id] = cidx

# ── 7. Compute cosine similarity in batches & extract top-N ───────────
print(f"Computing top-{TOP_N_SIMILAR} collaborative similar movies "
      f"(batches of {BATCH_SIZE})...")

# Output: dict of content_idx → list of [content_idx, score]
collab_similarity = {}

for batch_start in range(0, n_movies, BATCH_SIZE):
    batch_end = min(batch_start + BATCH_SIZE, n_movies)
    batch_features = item_features[batch_start:batch_end]

    # Cosine similarity of this batch vs all movies
    batch_sim = cosine_similarity(batch_features, item_features)

    for local_i in range(batch_end - batch_start):
        global_i = batch_start + local_i
        scores = batch_sim[local_i]

        # Get top N+1 indices (includes self), then filter self out
        top_indices = np.argpartition(scores, -TOP_N_SIMILAR - 1)[-(TOP_N_SIMILAR + 1):]
        top_indices = top_indices[top_indices != global_i]
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]][:TOP_N_SIMILAR]

        # Convert collaborative matrix indices to content-based indices
        movie_imdb_id = idx2movie[global_i]
        source_content_idx = imdb_to_content_idx.get(movie_imdb_id)
        if source_content_idx is None:
            continue

        similar_list = []
        for idx in top_indices:
            target_imdb_id = idx2movie[idx]
            target_content_idx = imdb_to_content_idx.get(target_imdb_id)
            if target_content_idx is not None:
                similar_list.append([int(target_content_idx),
                                     round(float(scores[idx]), 4)])

        collab_similarity[int(source_content_idx)] = similar_list

    if batch_end % 5000 == 0 or batch_end == n_movies:
        print(f"  Processed {batch_end}/{n_movies} movies...")

# ── 8. Export JSON ────────────────────────────────────────────────────
print(f"Writing {OUTPUT_FILE}...")

output = {
    "collab_similarity": collab_similarity,
    "collab_movie_count": n_movies,
}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False)

file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
print(f"Done! Output file size: {file_size_mb:.1f} MB")
print(f"Movies with collaborative data: {len(collab_similarity)}")
