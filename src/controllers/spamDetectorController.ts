import { Request, Response, NextFunction } from "express";
import { Logger, SpamDetection } from "../types";
import { z } from "zod";

const PostAnalysisSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Content cannot be empty")
    .max(5000, "Content too long")
    .transform((val: string) =>
      val.replace(/[<>&"']/g, (match: string) => {
        const escapeMap: { [key: string]: string } = {
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&#x27;",
        };
        return escapeMap[match];
      }),
    ),

  userID: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid userID format"),

  platform: z.enum(["twitter"]),

  requestId: z.string().trim(),

  clientMetadata: z
    .object({
      userAgent: z.string().trim().optional(),
      ipAddress: z
        .string()
        .trim()
        .regex(
          /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
          "Invalid IP address",
        )
        .optional(),
      timestamp: z
        .string()
        .trim()
        .datetime("Invalid timestamp format")
        .optional(),
    })
    .optional(),
});

export class SpamDetectionController {
  constructor(
    private SpamDetectionService: SpamDetection,
    private logger: Logger,
  ) {}

  async detect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = PostAnalysisSchema.parse(req.body);
      const result = await this.SpamDetectionService.analyzePost(validatedBody);

      res.json({
        result,
        status: "ok",
        service: "spam-detection",
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      next(e);
    }
  }
  async healthCheck(req: Request, res: Response): Promise<void> {
    this.logger.log("info", "health/ requested");
    res.json({
      status: "ok",
      service: "spam-detection",
      timestamp: new Date().toISOString(),
    });
  }
}
