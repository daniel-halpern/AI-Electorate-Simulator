# AI Electorate Simulator
## Full System Architecture & Implementation Plan
Author: Daniel Halpern
Goal: Hackathon MVP optimized for SWE internship signaling

---

# 1. Project Vision

Build a governance simulation platform that:

- Generates synthetic AI citizens using Gemini API
- Maps citizens into a structured ideological vector space
- Converts natural-language policy proposals into numeric policy vectors
- Simulates voting behavior using mathematical modeling
- Models polarization and ideological drift over time
- Visualizes ideological clustering and systemic stability
- Produces AI-generated political analysis

This is not a chatbot.
It is a full-stack simulation engine using Gemini for semantic abstraction.

---

# 2. Resume-Optimized Tech Stack

## Frontend
- Next.js (App Router)
- TypeScript
- TailwindCSS
- D3.js (for ideological visualization)
- Zustand or React Context (state management)

## Backend
- Next.js API Routes OR separate Node.js Express server
- TypeScript
- Zod (schema validation)
- Google Gemini API
- mathjs or custom vector utilities
- ml-pca or custom PCA implementation

## Deployment
- Vercel (frontend + serverless API routes)
OR
- Separate: Vercel (frontend) + Railway/Render (Node backend)

## Optional Enhancements
- Supabase (store simulation runs)
- Framer Motion (animation polish)
- ElevenLabs API (voice narration)

---

# 3. System Architecture

Client (Next.js Frontend)
    |
    | POST /api/simulate
    v
Server (Node + TypeScript)
    |
    |---> Gemini API (Agent Generation)
    |---> Gemini API (Policy Vectorization)
    |
Simulation Engine (TypeScript)
    |
    |---> Voting Model
    |---> Drift Simulation
    |---> Polarization Metrics
    |
Return structured simulation result JSON
    |
Frontend Visualization (D3.js)

---

# 4. Ideological Vector Space Design

Each citizen and policy is represented in 6 dimensions:

economic: -1 to 1  
social: -1 to 1  
environmental: 0 to 1  
authority_preference: 0 to 1  
collectivism: 0 to 1  
risk_tolerance: 0 to 1  

TypeScript interface:

```ts
interface IdeologyVector {
  economic: number
  social: number
  environmental: number
  authority_preference: number
  collectivism: number
  risk_tolerance: number
}
```

---

# 5. Agent Generation (Gemini Role #1)

Endpoint: /api/generateAgents

Prompt Gemini to return STRICT JSON:

{
  "citizens": [
    {
      "name": "...",
      "age": number,
      "worldview": "...",
      "ideology": {
        "economic": float,
        "social": float,
        "environmental": float,
        "authority_preference": float,
        "collectivism": float,
        "risk_tolerance": float
        }
    }
  ]
}

Generate 150–250 citizens for MVP.

Validate using Zod before parsing.

Store in memory for simulation session.

---

# 6. Policy Vectorization (Gemini Role #2)

Endpoint: /api/vectorizePolicy

Input:
{
  "policyText": string
}

Gemini converts natural language into structured ideology vector:

{
  "economic": float,
  "social": float,
  "environmental": float,
  "authority_preference": float,
  "collectivism": float,
  "risk_tolerance": float
}

---

# 7. Voting Simulation Engine

Distance Function:

Euclidean distance between citizen ideology and policy vector.

Voting Probability:

supportProbability = sigmoid(-alpha * distance)

Where alpha controls ideological rigidity.

TypeScript example:

```ts
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}
```

Vote sampled via Math.random() < supportProbability.

Return:
- supportCount
- opposeCount
- voteMap[]

---

# 8. Polarization Metrics

Compute:

1. Mean ideological variance
2. Average pairwise distance
3. Vote entropy
4. Margin of victory

Example metric:

polarizationIndex = averagePairwiseDistance(citizenVectors)

Higher value = greater ideological fragmentation.

---

# 9. Social Drift Simulation (Optional Advanced Feature)

For 3–5 rounds:

For each citizen:
- Find k nearest neighbors
- Move ideology slightly toward neighbor mean

Recalculate votes per round.

Animate rounds on frontend.

---

# 10. Visualization Plan

Use D3.js to:

1. Reduce 6D vectors to 2D via PCA
2. Plot citizens as circles
3. Color by vote
4. Animate drift rounds
5. Display metrics dashboard

UI Components:
- Policy input box
- Simulation button
- Ideology scatter plot
- Metrics sidebar
- AI narrative output

---

# 11. Narrative Analysis (Gemini Role #3)

After simulation:

Send summary stats to Gemini:

{
  supportPercentage,
  oppositionPercentage,
  polarizationIndex,
  driftTrend,
  marginOfVictory
}

Prompt:
"Generate a two-paragraph political analysis describing likely societal consequences."

Display result below visualization.

Optional: Send to ElevenLabs for narration.

---

# 12. MVP Scope for 24 Hours (Solo)

Must Build:
- Agent generation
- Policy vectorization
- Voting engine
- PCA visualization
- Metrics panel
- Gemini narrative

Optional If Time:
- Drift animation
- Voice narration
- Save/share simulation link

---

# 13. Resume Positioning

This project demonstrates:

- Full-stack TypeScript architecture
- API integration (Gemini)
- Schema validation (Zod)
- Statistical modeling
- Simulation engine design
- Data visualization with D3
- Clean separation of concerns
- Production-style structure

Resume Line Example:

"Built full-stack AI governance simulator using Next.js, TypeScript, and Google Gemini API to model ideological vector spaces, simulate policy voting via probabilistic modeling, and visualize polarization dynamics using D3.js."

---

# 14. Estimated Timeline (Solo)

Project setup: 1 hour  
Gemini integration: 3–4 hours  
Simulation engine: 4–5 hours  
Visualization: 6–8 hours  
Narrative layer: 2 hours  
Polish + debugging: 4 hours  

Total: ~20–24 hours focused build time.

---

# End of Document