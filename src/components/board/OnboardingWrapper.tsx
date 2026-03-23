'use client'

import { useState } from 'react'
import OnboardingFlow from './OnboardingFlow'
import KanbanBoard from './KanbanBoard'
import { Application, Board, User } from '@/types'

interface Props {
  userId: string
  initialApplications: Application[]
  boards: Board[]
  activeBoard: Board | null
  profile: User | null
}

export default function OnboardingWrapper({
  userId,
  initialApplications,
  boards,
  activeBoard,
  profile,
}: Props) {
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [updatedBoardName, setUpdatedBoardName] = useState<string | null>(null)

  function handleOnboardingComplete(boardName: string) {
    setUpdatedBoardName(boardName)
    setOnboardingDone(true)
  }

  const updatedBoard = activeBoard && updatedBoardName
    ? { ...activeBoard, name: updatedBoardName }
    : activeBoard

  if (!onboardingDone) {
    return <OnboardingFlow userId={userId} onComplete={handleOnboardingComplete} />
  }

  return (
    <KanbanBoard
      initialApplications={initialApplications}
      boards={updatedBoard ? [updatedBoard, ...boards.slice(1)] : boards}
      activeBoard={updatedBoard}
      profile={profile}
    />
  )
}