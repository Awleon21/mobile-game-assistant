"use client";

import React from "react";
import styles from "./page.module.css";

const Home = () => {
  const categories = {
    Proceed: "all",
  };

  return (
    <main className={styles.main}>
      <div className={styles.title}>
        Proceed to chat with the assistant by selecting a category below
      </div>
      <div className={styles.container}>
        {Object.entries(categories).map(([name, url]) => (
          <a key={name} className={styles.category} href={`/MarvelStrikeForce/${url}`}>
            {name}
          </a>
        ))}
      </div>
    </main>
  );
};

export default Home;
