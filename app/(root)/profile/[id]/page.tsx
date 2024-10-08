/* eslint-disable no-unused-vars */
import ProfileLink from "@/components/shared/ProfileLink";
import Stats from "@/components/shared/Stats";
import { Button } from "@/components/ui/button";
import { getUserInfo } from "@/lib/actions/user.action";
import { getJoinedDate } from "@/lib/utils";
import { URLProps } from "@/types";
import { auth, SignedIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuestionTab from "@/components/shared/QuestionTab";
import AnswerTab from "@/components/shared/AnswerTab";
import { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { userId } = auth();

  const userInfo = await getUserInfo({ userId: params.id });
  const userName = userInfo.user.name;

  return {
    title: `${userName} Profile`,
    description: `Explore your own or other users' profiles on DevFlow. View contributions, including questions, answers, and earned badges.
    Edit your profile to highlight your expertise, or browse through others' achievements and activities in the community.`,
  };
}

const Page = async ({ params, searchParams }: URLProps) => {
  const { userId: clerkId } = auth();

  const userInfo = await getUserInfo({ userId: params.id });

  return (
    <>
      <div className="flex flex-col items-start justify-between">
        <div className="flex w-full flex-col items-start justify-between gap-4 lg:flex-row">
          <Image
            src={userInfo.user.picture}
            alt="profile picture"
            width={140}
            height={140}
            className="rounded-full object-cover"
          />
          <div className="mt-3">
            <h2 className="h2-bold text-dark100_light900">
              {userInfo.user.name}
            </h2>
            <p className="paragraph-regular text-dark200_light800">
              @{userInfo.user.username}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-start gap-5">
              {userInfo.user.portfolioWebsite && (
                <ProfileLink
                  imgUrl="/assets/icons/link.svg"
                  href={userInfo.user.portfolioWebsite}
                  title="portofolio"
                />
              )}
              {userInfo.user.location && (
                <ProfileLink
                  imgUrl="/assets/icons/location.svg"
                  title={userInfo.user.location}
                />
              )}
              <ProfileLink
                imgUrl="/assets/icons/calendar.svg"
                title={getJoinedDate(userInfo.user.joinedAt)}
              />
            </div>
            {userInfo.user.bio && (
              <p className="paragraph-regular text-dark400_light800 mt-8">
                {userInfo.user.bio}
              </p>
            )}
          </div>
          <div className="ml-auto flex max-sm:mb-5 max-sm:w-full sm:mt-3">
            <SignedIn>
              {clerkId === userInfo.user.clerkId && (
                <Link href="/profile/edit">
                  <Button className="paragraph-medium btn-secondary text-dark300_light900 min-h-[46px] min-w-[175px] px-4 py-3">
                    Edit Profile
                  </Button>
                </Link>
              )}
            </SignedIn>
          </div>
        </div>

        <Stats
          totalQuestions={userInfo.totalQuestions}
          totalAnswers={userInfo.totalAnswers}
          badge={userInfo.badgeCount}
          reputation={userInfo.reputation}
        />
        <div className="mt-10 flex gap-10">
          <Tabs defaultValue="top-posts" className="flex-1">
            <TabsList className="background-light800_dark400 mb-5 min-h-[42px] p-1">
              <TabsTrigger value="top-posts" className="tab">
                Top Posts
              </TabsTrigger>
              <TabsTrigger value="answers" className="tab">
                Answers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="top-posts">
              <QuestionTab
                searchParams={searchParams}
                userId={userInfo.user._id}
                clerkId={clerkId}
              />
            </TabsContent>
            <TabsContent value="answers" className="flex w-full flex-col gap-6">
              <AnswerTab
                searchParams={searchParams}
                userId={userInfo.user._id}
                clerkId={clerkId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Page;
