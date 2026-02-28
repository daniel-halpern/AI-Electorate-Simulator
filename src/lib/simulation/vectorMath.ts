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
export function calculateSupportProbability(distance: number, alpha: number = 2.5, inflectionPoint: number = 1.6): number {
    // In a 6D space where most axes are [-1, 1] or [0, 1],
    // The maximum possible distance is roughly ~3.46.
    // The average distance between two random points is around ~1.2 to 1.5.

    // A tuned modified sigmoid mapping a positive distance to a 1.0 to 0.0 scale:
    // If distance is near 0, probability should be very near 100%.
    // If distance is around the average (1.2), they should be somewhat neutral but leaning "no".

    // We set the inflection point (exactly 50% chance of voting yes/no) to 1.6.
    // This allows universally good policies to naturally gain a super-majority.
    const x = -alpha * (distance - inflectionPoint);
    return 1 / (1 + Math.exp(-x));
}

// 2a. Turnout Probability
// The further you are from the inflection point (feeling indifferent), 
// the more likely you are to actually get off the couch and vote.
// A person who fiercely loves (distance ~ 0) or fiercely hates (distance ~ 3) will vote.
// A person who feels "meh" (distance ~ 1.6) might just stay home.
export function calculateTurnoutProbability(distance: number, inflectionPoint: number = 1.6): number {
    // Distance from the indifference point. 
    // At exactly the inflection point, diff is 0. 
    // At max love (0), diff is 1.6. At max hate (3.4), diff is 1.8.
    const diff = Math.abs(distance - inflectionPoint);

    // We want diff=0 -> ~40% turnout (base low turnout for municipal/boring stuff)
    // We want diff>1.5 -> ~95% turnout (highly motivated)
    // Let's use a simple linear map or curve.

    // Max theoretical diff is around 1.8 
    const baseTurnout = 0.40;
    const maxMotivationBonus = 0.55; // 0.40 + 0.55 = 0.95 max turnout

    // Scale diff (0 to ~1.8) to a percentage (0 to 1)
    const normalizedMotivation = Math.min(1, diff / 1.5);

    return baseTurnout + (normalizedMotivation * maxMotivationBonus);
}

// 3. Complete Simulation Run
export function runSimulation(policy: Policy, electorate: Citizen[]): SimulationResult {
    let supportCount = 0;
    let opposeCount = 0;
    const inflectionPoint = 1.6;

    const votes = electorate.map(citizen => {
        const dist = euclideanDistance(citizen.ideology, policy.vector);
        let prob = calculateSupportProbability(dist, 2.5, inflectionPoint);
        let turnoutProb = calculateTurnoutProbability(dist, inflectionPoint);

        // Valence / Universal Appeal Shift:
        // For troll policies that are universally loved (save puppies) or hated (kill everyone),
        // we linearly shift the ideological probability up or down.
        if (policy.universal_appeal !== undefined && policy.universal_appeal !== 0) {
            prob += policy.universal_appeal;
            prob = Math.max(0, Math.min(1, prob)); // Clamp to 0-1

            // If the policy is universally appealing/hated, turnout naturally spikes
            turnoutProb += Math.abs(policy.universal_appeal) * 0.5;
            turnoutProb = Math.min(1, turnoutProb);
        }

        // Did they even vote?
        const didVote = Math.random() < turnoutProb;

        // How would they have voted if forced?
        const vote = Math.random() < prob;

        // Only count it if they actually voted
        if (didVote) {
            if (vote) supportCount++;
            else opposeCount++;
        }

        return {
            citizenId: citizen.id,
            vote,
            didVote,
            distanceToPolicy: dist,
            supportProbability: prob,
            turnoutProbability: turnoutProb,
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
