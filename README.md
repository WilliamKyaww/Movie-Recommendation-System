# Movie Recommendation System

A hybrid movie recommendation system that combines **collaborative filtering** and **content-based filtering** techniques to generate personalised movie suggestions. The project demonstrates how user-item interaction data and text-based content features can be integrated to improve recommendation accuracy and efficiency.

---

## Overview
This project explores how recommendation systems can learn user preferences by analysing both historical ratings and movie metadata.  
It uses the **IMDB–MovieLens merged dataset** and implements algorithms to identify similar users and items based on their profiles and viewing history.

---

## Key Features
- **Data Preprocessing:** Cleaned and merged IMDB and MovieLens datasets, handled missing values, and standardised column formats.  
- **Collaborative Filtering:** User–item similarity computed using cosine similarity.  
- **Content-Based Filtering:** TF-IDF vectorization on movie descriptions to recommend semantically similar titles.  
- **Hybrid Approach:** Combined similarity scores to enhance diversity and coverage of recommendations.  
- **Performance Optimization:** Replaced nested loops with vectorised operations in NumPy and Scikit-learn, reducing similarity computation time by ~95%.  
- **Evaluation:** Compared recommendation quality using precision and recall metrics, with qualitative validation of recommendation relevance.

---

## Technologies Used
- **Python**, **NumPy**, **pandas**, **Scikit-learn**, **Matplotlib**, os
- **TF-IDF Vectorization**, **Cosine Similarity**
- **Jupyter Notebook**, **Google Colab**
  
---

## IMDB Movie Dataset

Movie files downloaded from the IMDB database
Files downloaded from: https://datasets.imdbws.com/
Dataset information: https://developer.imdb.com/non-commercial-datasets/


