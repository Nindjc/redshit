# Redshit

<div align="center">
  <img src="monalisa.jpg" alt="Mona Lisa ASCII" width="100%">
</div>

Redshit is a specialized forensic interface designed to act as a force multiplier for Arctic Shift datasets. It transforms static Reddit archives into a dynamic, real-time intelligence environment, granting analysts unprecedented capabilities to track, parse, and profile digital footprints.

## OSINT Superpowers & Capabilities

This tool is engineered to extract maximum intelligence from archived data through advanced, localized processing:

* **Targeted Cloud Ingestion:** Pull datasets directly from the cloud, precisely filtered by selected day ranges to minimize initial payload size and drastically speed up operations.
* **Real-Time Subreddit Searching:** Execute instantaneous, single-word searches across the entirety of an ingested subreddit.
* **Deep Thread Reconstruction:** Resurrect, map, and reconstruct deeply nested or fragmented comment threads, maintaining conversational context even within massive data dumps.
* **Cloned Entity Fingerprinting:** Automatically map out user timelines and identify hidden alternate accounts. The engine utilizes sockpuppet gap analysis combined with stylometric fingerprinting to link disparate profiles to a single entity.
* **Relational Graphing & Serenity Group Mapping:** Deploy interactive node-based graphs to visualize complex relational networks. The engine features dedicated Serenity group mapping to isolate and cluster affiliated entities based on their interaction vectors.
* **Evidence Locker & Transforms:** Isolate high-value targets, posts, and threads in a persistent evidence collection locker. From the locker, run Maltego-esque visual transforms to graph relationships between users and extracted intelligence.
* **Advanced Entity Extraction:** Native parsers automatically comb the data to extract and categorize all URLs, phone numbers, and core entity types.
* **Regex Dictionary Parsing:** Go beyond standard extraction by applying a custom, self-assigned dictionary. The engine utilizes regex matching to flag highly specific terminology and behavioral patterns.

## Architecture & Mobile Optimization

Processing multi-gigabyte datasets natively demands ruthless resource management. Redshit is built to execute flawlessly, even within constrained mobile browser environments:

* **Memory Preservation:** The engine utilizes strict stretch chunking and aggressive garbage collection to ensure massive JSON archives can be processed without crashing mobile browsers.
* **Prestigious Interface:** Complex analytical tools do not need to look antiquated. The UI implements Apple-style frosted glass, precise rounding, and a clean layout to reduce cognitive load and visual fatigue during deep-dive investigations.

## Termux Execution & Deployment

Redshit is designed to run locally with zero heavy frameworks. To deploy and execute the environment natively within Termux:

**1. Install Python (if not already installed):**
`pkg update && pkg upgrade`
`pkg install python`

**2. Clone the repository and navigate into the project directory:**
`git clone https://github.com/Nindjc/redshit.git`
`cd redshit`

**3. Spin up the local Python web server:**
`python -m http.server 8080`

**4. Access the Interface:**
Open your mobile browser and navigate to:
`http://localhost:8080`
