import { Citizen } from "@/types/ideology";

export const MOCK_CITIZENS: Citizen[] = [
    {
        "id": "c164ed2f-0b44-469b-839e-4c74070220a2",
        "name": "Elias Thorne",
        "age": 42,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Believes in free markets but worries about environmental collapse.",
        "ideology": {
            "economic": 0.6,
            "social": -0.2,
            "environmental": 0.8,
            "authority_preference": 0.4,
            "collectivism": 0.3,
            "risk_tolerance": 0.7
        }
    },
    {
        "id": "8bb384c3-631c-4cf2-9e8c-85de11cfbccc",
        "name": "Sarah Jenkins",
        "age": 28,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Advocates for universal healthcare and strict corporate regulation.",
        "ideology": {
            "economic": -0.8,
            "social": -0.9,
            "environmental": 0.9,
            "authority_preference": 0.6,
            "collectivism": 0.8,
            "risk_tolerance": 0.2
        }
    },
    {
        "id": "e8d96b99-a8fc-4c12-9856-2e5f5da8dbfe",
        "name": "Marcus Vance",
        "age": 55,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Strong national defense and traditional family values.",
        "ideology": {
            "economic": 0.5,
            "social": 0.8,
            "environmental": 0.2,
            "authority_preference": 0.9,
            "collectivism": 0.5,
            "risk_tolerance": 0.4
        }
    },
    {
        "id": "97b370a2-fde2-4632-b7ce-651dff62efb6",
        "name": "Luna Reyes",
        "age": 22,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Anarcho-communist who wants to dismantle all hierarchies.",
        "ideology": {
            "economic": -1.0,
            "social": -1.0,
            "environmental": 1.0,
            "authority_preference": 0.0,
            "collectivism": 0.9,
            "risk_tolerance": 0.9
        }
    },
    {
        "id": "1ab71eb1-b541-477c-a4f6-82f5b5c92c4f",
        "name": "David Chen",
        "age": 35,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Tech libertarian who thinks AI and crypto will solve everything.",
        "ideology": {
            "economic": 0.9,
            "social": -0.5,
            "environmental": 0.3,
            "authority_preference": 0.1,
            "collectivism": 0.1,
            "risk_tolerance": 1.0
        }
    },
    {
        "id": "62b9ad78-df57-41cc-b1c4-16e7887532df",
        "name": "Valerie O'Connor",
        "age": 68,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Centrist who just wants the potholes fixed and taxes lowered slightly.",
        "ideology": {
            "economic": 0.2,
            "social": 0.1,
            "environmental": 0.5,
            "authority_preference": 0.5,
            "collectivism": 0.4,
            "risk_tolerance": 0.1
        }
    },
    {
        "id": "a918fc9b-cc7e-40e1-a0a4-37a5f60afb1c",
        "name": "Jamal Washington",
        "age": 31,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Social democrat focused on systemic inequality and union power.",
        "ideology": {
            "economic": -0.7,
            "social": -0.6,
            "environmental": 0.6,
            "authority_preference": 0.5,
            "collectivism": 0.7,
            "risk_tolerance": 0.3
        }
    },
    {
        "id": "2d1a3371-ebd6-4bca-8422-4809f6eeb0bf",
        "name": "Chloe Dupont",
        "age": 40,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Eco-fascist who believes strong central authority is needed to save the planet.",
        "ideology": {
            "economic": 0.0,
            "social": 0.5,
            "environmental": 1.0,
            "authority_preference": 0.9,
            "collectivism": 0.8,
            "risk_tolerance": 0.6
        }
    },
    {
        "id": "db8cf822-4a0b-4654-8c83-5ecba059c250",
        "name": "Arthur Pendelton",
        "age": 75,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Old-school conservative, believes in slow reform and strict constitutionalism.",
        "ideology": {
            "economic": 0.4,
            "social": 0.9,
            "environmental": 0.1,
            "authority_preference": 0.7,
            "collectivism": 0.2,
            "risk_tolerance": 0.0
        }
    },
    {
        "id": "f5c40467-360e-473d-bc65-d05de6b683cf",
        "name": "Maya Singh",
        "age": 25,
        "gender": "Unknown",
        "job": "Unknown",
        "worldview": "Pragmatic progressive building local mutual aid networks.",
        "ideology": {
            "economic": -0.5,
            "social": -0.7,
            "environmental": 0.7,
            "authority_preference": 0.2,
            "collectivism": 0.9,
            "risk_tolerance": 0.5
        }
    }
];

// For the hackathon MVP, we generate 90 more randomly scattered citizens to pad it to 100
// while ensuring they adhere to the schema types.
for (let i = 0; i < 90; i++) {
    MOCK_CITIZENS.push({
        id: `mock-citizen-${i}`,
        name: `Citizen ${i + 11}`,
        age: Math.floor(Math.random() * (80 - 18 + 1)) + 18,
        gender: "Unknown",
        job: "Unknown",
        worldview: "A simulated baseline citizen with moderate, randomly-sampled views.",
        ideology: {
            economic: (Math.random() * 2) - 1, // -1 to 1
            social: (Math.random() * 2) - 1,   // -1 to 1
            environmental: Math.random(),      // 0 to 1
            authority_preference: Math.random(),// 0 to 1
            collectivism: Math.random(),       // 0 to 1
            risk_tolerance: Math.random()      // 0 to 1
        }
    });
} 
