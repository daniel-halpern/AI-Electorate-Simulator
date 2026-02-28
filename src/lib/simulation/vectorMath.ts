import { Citizen, IdeologyVector, Policy, SimulationResult } from "@/types/ideology";
import { distance } from "mathjs";

// Extracts just the vector values as an array for mathjs to compute distance
function toArray(vector: IdeologyVector): number[] {
    return [
        vector.economic,
        vector.social,
        vector.environmental,
        vector.authority_preference,
        vector.collectivism,
        vector.risk_tolerance,
    ];
}

// 1. Distance Function
// Euclidean distance between citizen ideology and policy vector.
export function euclideanDistance(a: IdeologyVector, b: IdeologyVector): number {
    const arrA = toArray(a);
    const arrB = toArray(b);

    // Math.js distance formula for n-dimensional Euclidean arrays
    return distance(arrA, arrB) as number;
}

// 2. Voting Probability
// supportProbability = sigmoid(-alpha * distance)
export function calculateSupportProbability(distance: number, alpha: number = 2.5): number {
    // In a 6D space where most axes are [-1, 1] or [0, 1],
    // The maximum possible distance is roughly ~3.46.
    // The average distance between two random points is around ~1.2 to 1.5.

    // A tuned modified sigmoid mapping a positive distance to a 1.0 to 0.0 scale:
    // If distance is near 0, probability should be very near 100%.
    // If distance is around the average (1.2), they should be somewhat neutral but leaning "no".

    // We set the inflection point (exactly 50% chance of voting yes/no) to 1.6.
    // This allows universally good policies to naturally gain a super-majority.
    const inflectionPoint = 1.6;
    const x = -alpha * (distance - inflectionPoint);
    return 1 / (1 + Math.exp(-x));
}

// 3. Complete Simulation Run
export function runSimulation(policy: Policy, electorate: Citizen[]): SimulationResult {
    let supportCount = 0;
    let opposeCount = 0;

    const votes = electorate.map(citizen => {
        const dist = euclideanDistance(citizen.ideology, policy.vector);
        let prob = calculateSupportProbability(dist);

        // Valence / Universal Appeal Shift:
        // For troll policies that are universally loved (save puppies) or hated (kill everyone),
        // we linearly shift the ideological probability up or down.
        if (policy.universal_appeal !== undefined && policy.universal_appeal !== 0) {
            prob += policy.universal_appeal;
            prob = Math.max(0, Math.min(1, prob)); // Clamp to 0-1
        }

        // Probabilistic vote sampling
        const vote = Math.random() < prob;

        if (vote) supportCount++;
        else opposeCount++;

        return {
            citizenId: citizen.id,
            vote,
            distanceToPolicy: dist,
            supportProbability: prob,
        };
    });

    const passed = supportCount > opposeCount;
    const marginOfVictory = Math.abs(supportCount - opposeCount);
    const totalVotes = supportCount + opposeCount;

    // Placeholder for polarization metric. 
    // Will implement Mean Ideological Variance or Avg Pairwise Distance later.
    const polarizationIndex = calculatePolarizationIndex(electorate);

    return {
        policy,
        totalVotes,
        supportCount,
        opposeCount,
        marginOfVictory,
        passed,
        votes,
        polarizationIndex,
    };
}

// 4. Polarization Metric (Helper)
// Mean ideological variance: calculate the centroid, then average distance to centroid.
export function calculatePolarizationIndex(electorate: Citizen[]): number {
    if (electorate.length === 0) return 0;

    const sums = {
        eco: 0, soc: 0, env: 0, auth: 0, col: 0, risk: 0
    };

    electorate.forEach(c => {
        sums.eco += c.ideology.economic;
        sums.soc += c.ideology.social;
        sums.env += c.ideology.environmental;
        sums.auth += c.ideology.authority_preference;
        sums.col += c.ideology.collectivism;
        sums.risk += c.ideology.risk_tolerance;
    });

    const n = electorate.length;
    const centroid: IdeologyVector = {
        economic: sums.eco / n,
        social: sums.soc / n,
        environmental: sums.env / n,
        authority_preference: sums.auth / n,
        collectivism: sums.col / n,
        risk_tolerance: sums.risk / n,
    };

    const distances = electorate.map(c => euclideanDistance(c.ideology, centroid));
    const sumDistances = distances.reduce((a, b) => a + b, 0);

    // Average distance from the centroid = Polarization Index
    // Higher = more scattered/fragmented populace
    return sumDistances / n;
}
