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
- **Performance Optimization:** Replaced nested loops with vectorised operations in NumPy and Scikit-learn, reducing similarity computation time by ~95%.  
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
- Files downloaded from [here](https://datasets.imdbws.com/)
- For more dataset information check [here](https://developer.imdb.com/non-commercial-datasets/)

### MovieLens dataset:
- File downloaded from [here](https://grouplens.org/datasets/movielens/) (ml-latest.zip under education and development)




