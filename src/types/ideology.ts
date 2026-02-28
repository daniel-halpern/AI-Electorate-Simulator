import { z } from "zod";

// The 6D Ideology Space
// This defines every agent and policy in the simulator
export const ideologyVectorSchema = z.object({
  // -1 (Left/Socialist) to 1 (Right/Capitalist)
  economic: z.number().min(-1).max(1),
  // -1 (Progressive) to 1 (Conservative)
  social: z.number().min(-1).max(1),
  // 0 (Exploitative) to 1 (Conservationist)
  environmental: z.number().min(0).max(1),
  // 0 (Libertarian/Anarchic) to 1 (Authoritarian/Statist)
  authority_preference: z.number().min(0).max(1),
  // 0 (Individualist) to 1 (Collectivist)
  collectivism: z.number().min(0).max(1),
  // 0 (Risk Averse) to 1 (Risk Tolerant)
  risk_tolerance: z.number().min(0).max(1),
});

export type IdeologyVector = z.infer<typeof ideologyVectorSchema>;

// An AI-generated Citizen
export const citizenSchema = z.object({
  id: z.string(), // Relaxed from .uuid() because Gemini struggles with perfect UUID formatting in bulk
  name: z.string(),
  age: z.number().int().min(18).max(100),
  worldview: z.string(), // A short narrative sentence explaining their views
  ideology: ideologyVectorSchema,
});

export type Citizen = z.infer<typeof citizenSchema>;

export const citizensListSchema = z.object({
  citizens: z.array(citizenSchema),
});

// A generated policy document ready for simulation
export const policySchema = z.object({
  title: z.string(),
  description: z.string(),
  vector: ideologyVectorSchema, // The numerical center of this policy
});

export type Policy = z.infer<typeof policySchema>;

// The output of a simulation run
export interface SimulationResult {
  policy: Policy;
  totalVotes: number;
  supportCount: number;
  opposeCount: number;
  marginOfVictory: number;
  passed: boolean; // support > oppose

  // Array of individual citizen actions
  votes: Array<{
    citizenId: string;
    vote: boolean; // true = support, false = oppose
    distanceToPolicy: number;
    supportProbability: number;
  }>;

  // Polarization Metrics
  polarizationIndex: number; // e.g., mean pairwise distance of the electorate
}
