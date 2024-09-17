"use client"
import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import Chat from "../../components/chat";
import { getPlayerCard } from "../../utils/roster";
import FileViewer from "../../components/file-viewer";

const FunctionCalling = () => {
  const [playerCardData, setPlayerCardData] = useState(null);

  // Fetch player card data on page load
  useEffect(() => {
    const fetchInitialPlayerCardData = async () => {
      const storedPlayerCardData = localStorage.getItem("playerCardData");

      // Check if localStorage contains error data
      if (storedPlayerCardData && !storedPlayerCardData.includes('"error"')) {
        console.log("Player card data found in localStorage:", storedPlayerCardData);
        setPlayerCardData(JSON.parse(storedPlayerCardData));
      } else {
        try {
          const data = await getPlayerCard();
          
          if (!data.error) {
            console.log("Player card info:", data);
            setPlayerCardData(data);
            localStorage.setItem("playerCardData", JSON.stringify(data));
          } else {
            console.error("Error fetching player card:", data.error);
            localStorage.removeItem("playerCardData"); 
            setPlayerCardData(null); 
          }
        } catch (error) {
          console.error("Error fetching player card on page load:", error);
        }
      }
    };

    fetchInitialPlayerCardData();
  }, []);

  // Handle function calls (OpenAI Assistant calls this)
  const functionCallHandler = async (call) => {
    const args = JSON.parse(call.function.arguments);

    // if (call?.function?.name === "get_roster") {
    //   const data = await getRoster(args.page, args.perPage); // Fetch roster
    //   console.log("Roster data:", data);
    //   setRosterData(data); // Update state with roster data
    //   return JSON.stringify(data); // Return the data as a response
    // }

    // if (call?.function?.name === "get_inventory") {
    //   console.log("Handling 'get_inventory' function call");

    //   const data = await getInventory({
    //     page: args.page,
    //     perPage: args.perPage,
    //     itemFormat: args.itemFormat,
    //     statsFormat: args.statsFormat,
    //     pieceInfo: args.pieceInfo,
    //     lang: args.lang,
    //     itemType: args.itemType,
    //   }); // Fetch inventory

    //   console.log("Inventory data:", data);
    //   setInventoryData(data); // Update state with inventory data
    //   return JSON.stringify(data); // Return the data as a response
    // }

    // if (call?.function?.name === "get_squads") {
    //   const data = await getSquads(args); // Fetch squads
    //   console.log("Squad data:", data);
    //   return JSON.stringify(data); // Return the data as a response
    // }

    // Handle the player card function call
    if (call?.function?.name === "get_player_card") {
      const data = await getPlayerCard(); // Fetch player card
      console.log("Player card data:", data);
      setPlayerCardData(data); // Update state with player card data
      localStorage.setItem("playerCardData", JSON.stringify(data));
      return JSON.stringify(data.data); // Return the data as a response
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.column}>
           {/* Render the Player Card Data */}
           {playerCardData ? (
            <div className={styles.card}>
              <div className={styles.iconFrameContainer}>
                <img src={playerCardData?.data?.frame || ""} alt="Player Frame" className={styles.frame} />
                <img src={playerCardData?.data?.icon || ""} alt="Player Icon" className={styles.icon} />
              </div>
              <h2>{playerCardData?.data?.name || "Unknown Player"}</h2>
              <p>Level: {playerCardData?.data?.level?.completedTier || "N/A"}</p>
              <p>EXP: {playerCardData?.data?.level?.points || 0}/{playerCardData?.data?.level?.goal || 0}</p>
              <p>Characters Collected: {playerCardData?.data?.charactersCollected || 0}</p>
              <p>Total Collection Power: {playerCardData?.data?.tcp || 0}</p>
              <p>Strongest Team Power: {playerCardData?.data?.stp || 0}</p>
              <p>Max Star Rank Characters: {playerCardData?.charactersAtMaxStarRank || 0}</p>
              <p>Arena Best Rank: {playerCardData?.bestArena || "N/A"}</p>
              <p>Latest Arena Rank: {playerCardData?.data?.latestArena || "N/A"}</p>
              <p>Latest Blitz Rank: {playerCardData?.data?.latestBlitz || "N/A"}</p>
              <p>Blitz Wins: {playerCardData?.data?.blitzWins || 0}</p>
            </div>
          ) : (
            <p>No player card data available.</p>
          )}
          <FileViewer />
        </div>
        <div className={styles.chatContainer}>
          <div className={styles.chat}>
            <Chat functionCallHandler={functionCallHandler} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default FunctionCalling;
