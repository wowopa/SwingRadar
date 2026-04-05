import {
  deletePortfolioCloseReviewsForUser,
  loadPortfolioCloseReviewsForUser
} from "@/lib/server/portfolio-close-reviews";
import { loadPortfolioJournalForUser, deletePortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import {
  loadPortfolioPersonalRulesForUser,
  deletePortfolioPersonalRulesForUser
} from "@/lib/server/portfolio-personal-rules";
import {
  loadPortfolioProfileForUser,
  deletePortfolioProfileForUser
} from "@/lib/server/portfolio-profile";
import {
  deleteUserOpeningRecheckBoardForUser,
  listUserOpeningRecheckScans
} from "@/lib/server/user-opening-recheck-board";
import {
  deleteUserAuthFootprint,
  getUserAccountById,
  verifyUserPasswordById
} from "@/lib/server/user-auth";

export async function exportUserAccountData(userId: string) {
  const account = await getUserAccountById(userId);
  if (!account) {
    return null;
  }

  const [profile, journal, closeReviews, personalRules, openingRecheckScans] = await Promise.all([
    loadPortfolioProfileForUser(userId),
    loadPortfolioJournalForUser(userId),
    loadPortfolioCloseReviewsForUser(userId),
    loadPortfolioPersonalRulesForUser(userId),
    listUserOpeningRecheckScans(userId)
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: account,
    portfolio: {
      profile,
      journal,
      closeReviews,
      personalRules,
      openingRecheckScans
    }
  };
}

export async function deleteCurrentUserAccount(input: {
  userId: string;
  password: string;
}) {
  await verifyUserPasswordById(input.userId, input.password);

  await Promise.all([
    deletePortfolioProfileForUser(input.userId),
    deletePortfolioJournalForUser(input.userId),
    deletePortfolioCloseReviewsForUser(input.userId),
    deletePortfolioPersonalRulesForUser(input.userId),
    deleteUserOpeningRecheckBoardForUser(input.userId)
  ]);

  await deleteUserAuthFootprint(input.userId);
}
