"""
Precompute movie recommendation data for the CineMatch web app.

Replicates the content-based filtering logic from Notebook 4:
1. Loads Final_Movie_Data.tsv
2. Resolves director/writer nm-IDs to real names via name.basics.tsv
3. Computes TF-IDF vectors + cosine similarity
4. Exports movie_data.json for the browser client
"""

import os
import json
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ── Paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
MOVIES_FILE = os.path.join(PROJECT_DIR, "Cleaned Datasets", "Final_Movie_Data.tsv")
NAMES_FILE = os.path.join(PROJECT_DIR, "IMDB Datasets", "name.basics.tsv")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "movie_data.json")

TOP_N_SIMILAR = 50  # How many similar movies to store per movie

# ── 1. Load movie data ────────────────────────────────────────────────
print("Loading movie data...")
df_movie = pd.read_csv(MOVIES_FILE, delimiter="\t")
print(f"  Loaded {len(df_movie)} movies")

# ── 2. Build name lookup from name.basics.tsv ─────────────────────────
print("Building name lookup (this may take a moment)...")

# Collect all nm-IDs we actually need so we don't store the entire 13M+ file
needed_ids = set()
for col in ["directors", "writers"]:
    for val in df_movie[col].dropna():
        for nid in str(val).split(","):
            needed_ids.add(nid.strip())

print(f"  Need to resolve {len(needed_ids)} unique name IDs")

name_lookup = {}
chunk_iter = pd.read_csv(NAMES_FILE, delimiter="\t", usecols=["nconst", "primaryName"],
                         chunksize=500_000, dtype=str)
for chunk in chunk_iter:
    mask = chunk["nconst"].isin(needed_ids)
    for _, row in chunk[mask].iterrows():
        name_lookup[row["nconst"]] = row["primaryName"]
    # Early exit if we found all
    if len(name_lookup) >= len(needed_ids):
        break

print(f"  Resolved {len(name_lookup)} names")


def resolve_names(id_string):
    """Convert comma-separated nm-IDs to comma-separated real names."""
    if pd.isna(id_string) or str(id_string).strip() == "":
        return ""
    ids = [nid.strip() for nid in str(id_string).split(",")]
    names = [name_lookup.get(nid, nid) for nid in ids]
    return ", ".join(names)


df_movie["directors_resolved"] = df_movie["directors"].apply(resolve_names)
df_movie["writers_resolved"] = df_movie["writers"].apply(resolve_names)

# ── 3. Create content features (same as Notebook 4) ───────────────────
print("Creating content features...")


def create_content_features(row):
    directors = str(row["directors"]) if pd.notna(row["directors"]) else ""
    writers = str(row["writers"]) if pd.notna(row["writers"]) else ""
    genres = str(row["genres"]) if pd.notna(row["genres"]) else ""
    year = str(row["startYear"]) if pd.notna(row["startYear"]) else ""
    tags = str(row["tags"]) if pd.notna(row["tags"]) else ""

    if pd.notna(row["runtimeMinutes"]):
        if row["runtimeMinutes"] > 120:
            runtime = "long"
        elif row["runtimeMinutes"] > 90:
            runtime = "medium"
        else:
            runtime = "short"
    else:
        runtime = ""

    if pd.notna(row["averageRating"]):
        if row["averageRating"] >= 7.5:
            rating = "highly_rated"
        elif row["averageRating"] >= 6.5:
            rating = "moderately_rated"
        else:
            rating = "average_rated"
    else:
        rating = ""

    return f"{genres} {directors} {writers} {year} {runtime} {rating} {tags}"


df_movie["content_features"] = df_movie.apply(create_content_features, axis=1)

# ── 4. TF-IDF + Cosine Similarity (batched) ───────────────────────────
print("Computing TF-IDF vectors...")
tfidf = TfidfVectorizer(stop_words="english")
tfidf_matrix = tfidf.fit_transform(df_movie["content_features"].fillna(""))
print(f"  TF-IDF matrix shape: {tfidf_matrix.shape}")

# ── 5. Build output JSON ──────────────────────────────────────────────
print("Building movie metadata...")

movies_list = []
for i, row in df_movie.iterrows():
    movie_obj = {
        "id": str(row.get("tconst", "")),
        "title": str(row.get("primaryTitle", "")),
        "year": int(row["startYear"]) if pd.notna(row.get("startYear")) else None,
        "runtime": int(row["runtimeMinutes"]) if pd.notna(row.get("runtimeMinutes")) else None,
        "genres": str(row.get("genres", "")) if pd.notna(row.get("genres")) else "",
        "rating": float(row["averageRating"]) if pd.notna(row.get("averageRating")) else None,
        "isAdult": int(row["isAdult"]) if pd.notna(row.get("isAdult")) else 0,
        "directors": str(row.get("directors_resolved", "")),
        "writers": str(row.get("writers_resolved", "")),
        "tags": str(row.get("tags", "")) if pd.notna(row.get("tags")) else "",
    }
    movies_list.append(movie_obj)

# Compute cosine similarity in batches to avoid MemoryError
# Instead of materializing the full 38K×38K dense matrix, we process
# BATCH_SIZE rows at a time and extract the top-N for each row.
BATCH_SIZE = 500
num_movies = len(df_movie)
similarity_data = [None] * num_movies

print(f"Computing top-{TOP_N_SIMILAR} similar movies per film (in batches of {BATCH_SIZE})...")
for batch_start in range(0, num_movies, BATCH_SIZE):
    batch_end = min(batch_start + BATCH_SIZE, num_movies)
    # Compute similarity for this batch of rows against ALL movies
    batch_sim = cosine_similarity(tfidf_matrix[batch_start:batch_end], tfidf_matrix)

    for local_i in range(batch_end - batch_start):
        global_i = batch_start + local_i
        scores = batch_sim[local_i]
        # Get top N+1 indices (includes self), then filter self out
        top_indices = np.argpartition(scores, -TOP_N_SIMILAR - 1)[-(TOP_N_SIMILAR + 1):]
        top_indices = top_indices[top_indices != global_i]  # remove self
        # Sort by score descending
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]][:TOP_N_SIMILAR]
        top_similar = [[int(idx), round(float(scores[idx]), 4)] for idx in top_indices]
        similarity_data[global_i] = top_similar

    print(f"  Processed {batch_end}/{num_movies} movies...")

output = {
    "movies": movies_list,
    "similarity": similarity_data,
}

print(f"Writing {OUTPUT_FILE}...")
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False)

file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
print(f"Done! Output file size: {file_size_mb:.1f} MB")
print(f"Total movies: {len(movies_list)}")
