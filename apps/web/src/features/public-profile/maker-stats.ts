/**
 * The marketplace's own opinion of a maker, as the design draws it.
 *
 * None of this comes from the profile someone wrote about themselves — it is
 * earned: how many briefs they finished, how fast they reply, whether the
 * platform has verified them. That is exactly why it is a separate type and a
 * separate prop rather than more fields on `PublicProfile`. A freelancer can
 * edit their headline; they must not be able to edit their success rate.
 *
 * **The API does not return any of this yet.** Every field is optional and the
 * screen renders nothing for the ones it is not given, so the published page
 * shows no figure until there is a real one behind it. The alternative —
 * shipping the design with plausible numbers in it — would put invented
 * credentials in front of the people deciding whether to hire someone.
 *
 * The design-system route passes a complete set so the layout can be reviewed
 * and swept at every window size, which is what a fixture is for (§1.6).
 */
export interface MakerStats {
  /** Share of briefs finished to the client's satisfaction, 0–100. */
  jobSuccessRate?: number;
  /** How many briefs this maker has completed. */
  completedBriefs?: number;
  /** Typical time to a first reply, in hours. */
  responseTimeHours?: number;
  /** Whether they are taking on full-time work, as opposed to occasional briefs. */
  fullTimeAvailability?: boolean;
  /**
   * Earned labels — "Verified Pro", "Punctual".
   *
   * `tone` is how the badge reads rather than a colour, so the palette can
   * change without every caller being edited: `trust` is something the platform
   * checked, `merit` something the maker earned.
   */
  badges?: readonly { label: string; tone: 'trust' | 'merit' }[];
  /**
   * Where the contact button goes.
   *
   * Absent until there is messaging to send someone to. A button that looks
   * like the main action on the page and does nothing when pressed is worse
   * than no button (§6.7), so the screen leaves it out rather than disabling it.
   */
  contactHref?: string;
}
