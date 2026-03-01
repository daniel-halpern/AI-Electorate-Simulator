# Technical Overview: AI Electorate Simulator
*Prepared for Hackathon Judges*

## Architecture Overview
The AI Electorate Simulator is a full-stack Next.js application that leverages Large Language Models (LLMs) not just for text generation, but for **procedural data generation and statistical modeling**. 

Unlike typical chatbots, this application uses Gemini as a deterministic math engine to convert qualitative human traits into quantitative vectors, which are then passed into a custom Euclidean voting simulation.

**Core Tech Stack:**
*   **Frontend:** Next.js (App Router), React, Tailwind CSS
*   **3D Visualization:** React Three Fiber, Three.js, Drei
*   **State & Math:** Math.js, ml-kmeans
*   **Backend / DB:** Node.js API Routes, User Sessions, MongoDB Atlas
*   **AI Engine:** Google Gemini (gemini-2.5-flash) for RAG generation and Roleplay

---

## 1. The Electorate Engine (Procedural Generation)
When a user inputs a demographic string (e.g., *"50% union workers in Ohio, 20% college students"*), the application does not just ask Gemini for text. It asks Gemini to return a strictly validated JSON array matching our `Citizen` schema.

Most importantly, Gemini is prompted to hallucinate a **6-Dimensional Ideology Vector** for each citizen, constrained to strict mathematical bounds:
1.  **Economic** (-1.0 Left to +1.0 Right)
2.  **Social** (-1.0 Progressive to +1.0 Conservative)
3.  **Environmental** (0.0 Exploitative to 1.0 Conservationist)
4.  **Authority** (0.0 Liberty to 1.0 Statist)
5.  **Collectivism** (0.0 Individual to 1.0 Collective)
6.  **Risk** (0.0 Averse to 1.0 Tolerant)

6.  **Risk** (0.0 Averse to 1.0 Tolerant)

**What does this mean?** 
In standard polling, a voter is often reduced to a single label like "Conservative" or "Liberal." In our **6-dimensional model**, we treat every citizen as a unique point in a high-dimensional space. By assigning 6 independent numerical scores (an "ideological fingerprint") to every person, we can simulate complex internal contradictions—like a voter who is economically conservative but socially progressive. This allows for a level of predictive nuance that a simple 1D or 2D model cannot capture. Instead of asking the AI to "act like a voter," we use these coordinates to *calculate* their vote.
**Enforcing Gaussian Noise via Prompt Engineering:**
If an AI is told to generate "Republicans" and "Democrats", it will plot their numerical coordinates in a perfect, boring straight line. To fix this, we enforce "Gaussian Noise" directly via the Gemini system prompt: *"Introduce heavy Gaussian variance... Ensure internal contradictions (e.g. socially progressive but economically conservative)... Scatter them into a natural blob, not a flat line."* This forces the LLM's number generation to mimic the messy, bell-curve distribution of real human opinions.

---

## 2. Theoretical Math: The Voting Simulation
When a policy is proposed (e.g., *"Ban all gas-powered cars"*), the text is sent back to Gemini via an API to be evaluated and translated into its own 6D Ideology Vector.

Once we have the Policy vector and the 100+ Citizen vectors, we execute the simulation locally in `src/lib/simulation/vectorMath.ts`:

### A. The Euclidean Distance
We use `math.js` to calculate the n-dimensional Euclidean distance between the Citizen's vector ($A$) and the Policy's vector ($B$):
$$ d(A,B) = \sqrt{\sum_{i=1}^{n} (A_i - B_i)^2} $$

### B. The Logistic Support Function
We run the raw distance through a tuned Logistic/Sigmoid function to calculate the probability of the Citizen voting "Yes".
$$ P(Support) = \frac{1}{1 + e^{-\alpha(d - \text{inflection})}} $$
*   **Inflection Point (1.6):** This is the average distance between two random points in our 6D space. At this exact distance, the citizen has a 50/50 chance of voting yes.
*   **Alpha (2.5):** The steepness of the curve. Closer distances rapidly approach 99% probability, while further distances rapidly approach 1%.

### C. Voter Turnout Probability
We calculate Turnout based on *Absolute Distance from the Inflection Point*.
If a citizen is very close to the policy (loves it) or very far (hates it), their motivation is high and turnout approaches 95%. If they are near the inflection point (indifferent), their motivation is low and turnout drops to ~40%.

We then roll `Math.random()` against both probabilities sequentially to determine the final simulated vote.

---

## 3. The 3D Graph Sorting Algorithm
The most complex visual element of the application is the `IdeologyScatter.tsx` component, which maps the 6D math onto a 3D visual space.

### Axis Compression
Because human monitors are 2D and Three.js is 3D, we must mathematically compress 6 dimensions into 3. We chose the three most highly polarized axes to represent physical space:
*   **X-Axis:** Economic Vector (Scaled 5x)
*   **Y-Axis:** Social Vector (Scaled 5x)
*   **Z-Axis:** Authority Vector (Mapped from [0, 1] to [-1, 1], Scaled 5x)

The remaining 3 dimensions (Risk, Environment, Collectivism) are retained in the math engine for voting probability, but are hidden visually to prevent graph clutter.

### K-Means Clustering (Factions)
To discover political factions, we run the `ml-kmeans` algorithm against the multi-dimensional dataset on the client side.
1. **Selecting 'k' (The number of factions):** We dynamically calculate the value of `k` based on the total size of the generated electorate. Our routing formula is `Math.floor(citizens / 10)`, hard-capped between a minimum of 2 and a maximum of 5. This ensures a small group of 20 people splits into a simple 2-party system, but a massive electorate of 100+ people is allowed to naturally fracture into 5 distinct parties.
2. The algorithm iteratively moves `k` centroids through the 6D space until it minimizes the variance between the citizens in each cluster.
2. We assign a unique hex color to each integer ID returned by the algorithm.
3. This creates the visual effect of "Factions", where citizens near each other in physical space naturally group into colored programmatic parties.

---

## 4. Sponsor Technology Integrations

Our project heavily leans on the following hackathon sponsors to push the boundary of what a standard React app can do:

*   **Google Gemini (gemini-2.5-flash):** Used extensively as both a structured data engine (generating the mathematical array of citizens via JSON Schema) and a roleplay engine (powering the 1-on-1 Chat Modals where users can debate individual dots on the 3D map).
*   **ElevenLabs:** Integrated into the Chat Modal to dynamically synthesize Gemini's text responses into realistic, playable voice audio for the simulated citizens.
*   **Auth0:** Provides secure, production-ready user authentication, allowing users to log in securely before saving or loading their simulation profiles.
*   **MongoDB Atlas:** Not a sponser in this event, but our primary cloud database. When a user runs a complex 500-person AI simulation, that massive math array is serialized and saved to MongoDB so it can be re-loaded instantly from the cloud dashboard later.
