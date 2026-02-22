# Movie Recommendation System

## Overview
A hybrid movie recommendation system that combines **collaborative** and **content-based** filtering techniques to generate personalised movie suggestions, using user–item interaction data and text-based content features to improve recommendation accuracy. The aim of the project is for the recommendation system to learn user preferences by analysing both historical ratings and movie metadata to deliver more relevant/better tailored recommendations.

It uses the **IMDB–MovieLens merged dataset** and implements algorithms to identify similar users and items based on their profiles and viewing history.

---

## Key Features
- **Data Preprocessing:** Cleaned and merged IMDB and MovieLens datasets, handled missing values, and standardised column formats.  
- **Collaborative Filtering:** User–item similarity computed using cosine similarity.  
- **Content-Based Filtering:** TF-IDF vectorisation on movie descriptions to recommend semantically similar titles.  
- **Hybrid Approach:** Combined similarity scores to enhance diversity and coverage of recommendations.  
- **Performance Optimisation:** Replaced nested loops with vectorised operations in NumPy and Scikit-learn, reducing similarity computation time by ~95%.  
- **Evaluation:** Compared recommendation quality using precision and recall metrics, with qualitative validation of recommendation relevance.

---

## Technologies Used
- **Language**: Python
- **Libraries**: NumPy, pandas, Scikit-learn, Matplotlib, os  
- **Techniques**: TF-IDF Vectorization, Cosine Similarity  
- **Environment**: Jupyter Notebook, Google Colab  
  
---

## Movie Dataset

### IMDB dataset:
- Datasets downloaded from [here](https://datasets.imdbws.com/)
- For more dataset information check [here](https://developer.imdb.com/non-commercial-datasets/)

### MovieLens dataset:
- Dataset downloaded from [here](https://grouplens.org/datasets/movielens/) (ml-latest.zip under education and development)

### Cleaned Datasets:
- **merged_movie_data.tsv**:  The cleaned, filtered and merged metadata for all movies. It contains core info like tconst (IMDb ID), release year, runtime, genres, average rating, directors, and writers, after also applying filters such as minimum rating count.

- **Final_Movie_Data.tsv**: 
The filtered and merged dataset used for Content-Based Filtering, after cross-referencing IMDB IDs with MovieLens IDs and adding an additional column for movie tags.

- **Audience_Ratings.csv**:
The User-Item Rating Matrix, used for Collaborative Filtering. It maps userId to imdbId and provides a numeric rating (normalised from 0 to 1).

They can be found in Kaggle [here](https://www.kaggle.com/datasets/williamkyaww/cleaned-and-filtered-movie-metadata)

---

## Dataset Folders Setup

As the datasets are large, they are not included in the repository. I have organised the files as follows:

```text
IMDB Datasets/           
├── name.basics.tsv
├── title.akas.tsv
├── title.basics.tsv
├── title.crew.tsv
├── title.episode.tsv
├── title.principals.tsv
└── title.ratings.tsv

MovieLens Datasets/     
├── genome-scores.csv
├── genome-tags.csv
├── links.csv
├── movies.csv
├── ratings.csv
├── README.txt
└── tags.csv

Cleaned Datasets/        
├── Audience_Ratings.csv
├── Final_Movie_Data.tsv
└── merged_movie_data.tsv
```
