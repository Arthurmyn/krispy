import type Anthropic from "@anthropic-ai/sdk";

// One tool per stage transition (src/lib/prompts/index.ts decides which of
// these is actually offered to the model for a given ChatStage) — this is
// the hard gate: a tool the model can't see is a tool it can't call.
// Stage order: Niche -> Style -> Idea -> Script -> Script review.

export const CONFIRM_NICHE_TOOL: Anthropic.Tool = {
  name: "confirm_niche",
  description:
    "Lock in the content niche/category once the user has agreed on it (e.g. 'life hacks', " +
    "'tech explainers', 'history storytelling'). Call this once it's settled, before discussing " +
    "visual style.",
  input_schema: {
    type: "object",
    properties: {
      niche: { type: "string", description: "The confirmed content niche, in a few words" },
    },
    required: ["niche"],
  },
};

export const CONFIRM_TOPIC_TOOL: Anthropic.Tool = {
  name: "confirm_topic",
  description:
    "Lock in the specific video topic/idea once the user has agreed on it. Only call this once " +
    "there's a concrete, specific topic — not while still brainstorming angles.",
  input_schema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "The finalized, specific video topic" },
    },
    required: ["topic"],
  },
};

export const LOCK_STYLE_TOOL: Anthropic.Tool = {
  name: "lock_style",
  description:
    "Lock in the visual style passport once the user has agreed on it. Call this once, after " +
    "the topic/idea is confirmed. Duration and language are handled separately, in the next " +
    "stage — don't ask about them here.",
  input_schema: {
    type: "object",
    properties: {
      styleBlock: {
        type: "string",
        description:
          "Compact English style phrase to append verbatim to every scene's image prompt",
      },
      characters: {
        type: "string",
        description: "Recurring characters/objects and their fixed English description, if any",
      },
      tone: { type: "string", description: "The agreed tone, in a few words" },
    },
    required: ["styleBlock"],
  },
};

// Split out of lock_style so duration/language get asked as their own step
// instead of being bundled into the visual style passport conversation.
export const SET_PARAMETERS_TOOL: Anthropic.Tool = {
  name: "set_parameters",
  description:
    "Lock in the target duration and language once the user has agreed on them. Call this once, " +
    "after the style passport is locked and before writing the script.",
  input_schema: {
    type: "object",
    properties: {
      durationSeconds: {
        type: "number",
        description: "Target total video length in seconds, agreed with the user",
      },
      language: {
        type: "string",
        description: "The language the voiceover/subtitles will be written in",
      },
    },
    required: ["durationSeconds", "language"],
  },
};

// The one tool available once the topic + style are locked. Calling it
// materializes Scene rows so the user can move on to reviewing per-scene
// images. Also used to finalize revisions during SCRIPT_REVIEW.
export const PROPOSE_SCENES_TOOL: Anthropic.Tool = {
  name: "propose_scenes",
  description:
    "Propose the finalized scene-by-scene script once the user has agreed on it. Only call this " +
    "when the user has confirmed they're happy with the script, not while still drafting it. " +
    "Calling it again later replaces the previous scenes with the new complete list.",
  input_schema: {
    type: "object",
    properties: {
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "Voiceover / subtitle text for this scene",
            },
            imagePrompt: {
              type: "string",
              description: "English prompt to generate this scene's image",
            },
            durationMs: {
              type: "number",
              description:
                "Estimated scene duration in milliseconds, based on how long the voiceover " +
                "line takes to read aloud",
            },
          },
          required: ["script", "imagePrompt"],
        },
      },
    },
    required: ["scenes"],
  },
};

// Fires once, right after the user approves every scene's image (triggered
// server-side, see approveScenes in src/app/api/projects/[id]/route.ts) —
// the assistant proactively posts the full voiceover script and this tool
// finalizes it once the user confirms or requests edits.
export const CONFIRM_VOICEOVER_TEXT_TOOL: Anthropic.Tool = {
  name: "confirm_voiceover_text",
  description:
    "Finalize the voiceover text for every scene once the user is happy with the wording " +
    "(as-is or after edits). Call this once, with the complete list of scenes — not just the " +
    "ones that changed.",
  input_schema: {
    type: "object",
    properties: {
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sceneNumber: {
              type: "number",
              description: "The scene number as shown in CURRENT SCENES (Scene 1, Scene 2, ...)",
            },
            voiceoverText: {
              type: "string",
              description: "Final voiceover text for this scene",
            },
          },
          required: ["sceneNumber", "voiceoverText"],
        },
      },
    },
    required: ["scenes"],
  },
};

// Entered on-demand from the Metadata tab, once script/style/scenes already
// exist — proposes what the user needs to actually publish the video.
export const PROPOSE_METADATA_TOOL: Anthropic.Tool = {
  name: "propose_metadata",
  description:
    "Propose publish metadata for the finished video: titles, a description, tags, and " +
    "thumbnail image prompts. Call this once, after presenting the proposal to the user.",
  input_schema: {
    type: "object",
    properties: {
      titles: {
        type: "array",
        items: { type: "string" },
        description: "3-5 candidate video titles",
      },
      description: {
        type: "string",
        description: "A publish-ready video description",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "5-10 relevant tags/keywords",
      },
      thumbnailPrompts: {
        type: "array",
        items: { type: "string" },
        description:
          "English image-generation prompts for 2-4 thumbnail candidates, each incorporating " +
          "the locked style block for visual consistency with the rest of the video",
      },
    },
    required: ["titles", "description", "tags", "thumbnailPrompts"],
  },
};
