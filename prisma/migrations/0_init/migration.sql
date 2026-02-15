-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" INTEGER NOT NULL,
    "utcDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "scoreHome" INTEGER,
    "scoreAway" INTEGER,
    "competitionCode" TEXT NOT NULL,
    "competitionName" TEXT NOT NULL DEFAULT 'Unknown',

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPrediction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "predictionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" SERIAL NOT NULL,
    "competitionCode" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "matchday" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "notifiedPre" BOOLEAN NOT NULL DEFAULT false,
    "notifiedPost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionAccuracy" (
    "id" SERIAL NOT NULL,
    "predictionId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "actualScoreHome" INTEGER NOT NULL,
    "actualScoreAway" INTEGER NOT NULL,
    "actualTotalGoals" INTEGER NOT NULL,
    "outcomeCorrect" BOOLEAN,
    "goalsOverUnderCorrect" BOOLEAN,
    "bttsCorrect" BOOLEAN,
    "cornersCorrect" BOOLEAN,
    "cardsCorrect" BOOLEAN,
    "offsidesCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionAccuracy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "Match_competitionCode_idx" ON "Match"("competitionCode");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_utcDate_idx" ON "Match"("utcDate");

-- CreateIndex
CREATE INDEX "Match_status_utcDate_idx" ON "Match"("status", "utcDate");

-- CreateIndex
CREATE INDEX "Match_homeTeamId_idx" ON "Match"("homeTeamId");

-- CreateIndex
CREATE INDEX "Match_awayTeamId_idx" ON "Match"("awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_matchId_type_locale_key" ON "Prediction"("matchId", "type", "locale");

-- CreateIndex
CREATE INDEX "UserPrediction_userId_idx" ON "UserPrediction"("userId");

-- CreateIndex
CREATE INDEX "UserPrediction_predictionId_idx" ON "UserPrediction"("predictionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPrediction_userId_predictionId_key" ON "UserPrediction"("userId", "predictionId");

-- CreateIndex
CREATE INDEX "Standing_competitionCode_idx" ON "Standing"("competitionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_competitionCode_season_key" ON "Standing"("competitionCode", "season");

-- CreateIndex
CREATE INDEX "MatchSubscription_matchId_idx" ON "MatchSubscription"("matchId");

-- CreateIndex
CREATE INDEX "MatchSubscription_userId_idx" ON "MatchSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSubscription_userId_matchId_key" ON "MatchSubscription"("userId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionAccuracy_predictionId_key" ON "PredictionAccuracy"("predictionId");

-- CreateIndex
CREATE INDEX "PredictionAccuracy_matchId_idx" ON "PredictionAccuracy"("matchId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPrediction" ADD CONSTRAINT "UserPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPrediction" ADD CONSTRAINT "UserPrediction_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSubscription" ADD CONSTRAINT "MatchSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSubscription" ADD CONSTRAINT "MatchSubscription_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionAccuracy" ADD CONSTRAINT "PredictionAccuracy_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 6.7.0 -> 7.4.0                        │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
