"use server";

import Question from "@/database/question.model";
import { connectToDatabase } from "../mongoose";
import {
  CreateQuestionParams,
  DeleteQuestionParams,
  EditQuestionParams,
  GetQuestionByIdParams,
  GetQuestionsParams,
  QuestionVoteParams,
  RecommendedParams,
} from "./shared.types";
import Tag from "@/database/tag.model";
import User from "@/database/user.model";
import { revalidatePath } from "next/cache";
import { Error, FilterQuery } from "mongoose";
import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";

export async function getQuestions(params: GetQuestionsParams) {
  try {
    connectToDatabase();

    const { searchQuery, filter, page = 1, pageSize = 10 } = params;

    const query: FilterQuery<typeof Question> = {};

    const skip = (page - 1) * pageSize; // skip the previous items as we get new items every time

    if (searchQuery) {
      query.$or = [
        { title: { $regex: new RegExp(searchQuery, "i") } },
        { content: { $regex: new RegExp(searchQuery, "i") } },
      ];
    }

    let sortOption = {};

    switch (filter) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "frequent":
        sortOption = { views: -1 };
        break;
      case "unanswered":
        query.answers = { $size: 0 };
        break;
      default:
        break;
    }

    const questions = await Question.find(query)
      .populate({ path: "tags", model: Tag })
      .populate({ path: "author", model: User })
      .sort(sortOption)
      .skip(skip) // skip the previous items as we get new items every time
      .limit(pageSize); // to get only the x elements at a time per page

    const totalQuestion = await Question.countDocuments(query);

    const isNext = totalQuestion > skip + questions.length;

    return { questions, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function createQuestion(params: CreateQuestionParams) {
  // eslint-disable-next-line no-empty
  try {
    // connect to db
    connectToDatabase();

    const { title, content, tags, author, path } = params;

    // create question
    const question = await Question.create({
      title,
      content,
      author,
    });

    // create the tags or get them if they already exist
    const tagDocuments = [];

    for (const tag of tags) {
      const existingTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tag}$`, "i") } },
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        { upsert: true, new: true }
      );

      tagDocuments.push(existingTag._id);
    }

    await Question.findByIdAndUpdate(question._id, {
      $push: { tags: { $each: tagDocuments } },
    });

    // Create an interaction record for the user's ask_question action
    await Interaction.create({
      user: author,
      action: "ask_question",
      question: question._id,
      tags: tagDocuments,
    });

    await User.findByIdAndUpdate(author, { $inc: { reputation: 5 } });
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getQuestionById(params: GetQuestionByIdParams) {
  try {
    connectToDatabase();

    const { questionId } = params;

    const question = await Question.findOne({ _id: questionId })
      .populate({ path: "tags", model: Tag, select: "_id name" })
      .populate({
        path: "author",
        model: User,
        select: "_id clerkId name picture",
      });
    return question;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function upvoteQuestion(params: QuestionVoteParams) {
  try {
    connectToDatabase();
    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if (hasupVoted) {
      updateQuery = { $pull: { upvotes: userId } };
    } else if (hasdownVoted) {
      updateQuery = {
        $pull: { downvotes: userId },
        $push: { upvotes: userId },
      };
    } else {
      updateQuery = { $addToSet: { upvotes: userId } };
    }

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    });

    // Increment author's reputation by +1/-1 for upvoting/revoking an upvote to the question
    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasupVoted ? -1 : hasdownVoted ? 2 : 1 },
    });

    // Increment author's reputation by +10/-10 for recieving an upvote/downvote to the question
    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasupVoted ? -10 : hasdownVoted ? 12 : 10 },
    });

    if (!question) {
      throw new Error("question not found");
    }

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function downvoteQuestion(params: QuestionVoteParams) {
  try {
    connectToDatabase();
    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if (hasdownVoted) {
      updateQuery = { $pull: { downvotes: userId } };
    } else if (hasupVoted) {
      updateQuery = {
        $pull: { upvotes: userId },
        $push: { downvotes: userId },
      };
    } else {
      updateQuery = { $addToSet: { downvotes: userId } };
    }

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    });

    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasdownVoted ? 1 : hasupVoted ? -2 : -1 },
    });

    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasdownVoted ? 2 : hasupVoted ? -12 : -2 },
    });

    if (!question) {
      throw new Error("question not found");
    }

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function editQuestion(params: EditQuestionParams) {
  try {
    connectToDatabase();

    const { questionId, title, content, path } = params;

    const question = await Question.findById(questionId).populate("tags");

    if (!question) throw new Error("Question not found");

    question.title = title;
    question.content = content;

    await question.save();

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteQuestion(params: DeleteQuestionParams) {
  try {
    connectToDatabase();

    const { questionId, path } = params;

    // Reputation Logic
    const question = await Question.findById(questionId);

    if (!question) throw new Error("Question Not Found");

    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: -5 },
    });

    // delete 1 question,
    await Question.deleteOne({ _id: questionId });
    // delete byk answer di question itu,
    await Answer.deleteMany({ question: questionId });
    // delete byk interaction di question itu
    await Interaction.deleteMany({ question: questionId });
    // update array question dgn delete spesifk questionid
    await Tag.updateMany(
      { questions: questionId }, // cari dulu
      { $pull: { questions: questionId } } // delete spesifik id
    );
    await User.updateMany(
      { saved: questionId },
      { $pull: { saved: questionId } }
    );

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getHotQuestion() {
  try {
    connectToDatabase();

    const hotQuestions = await Question.find({})
      .sort({ views: -1, answers: -1 })
      .limit(5);

    return { hotQuestions };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getRecommendQuestion(params: RecommendedParams) {
  try {
    connectToDatabase();

    const { userId, page = 1, pageSize = 10, searchQuery } = params;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      throw new Error("user not found");
    }

    // get user interaction
    const userInteractions = await Interaction.find({ user: user._id })
      .populate("tags")
      .exec();

    // get just the tag from user interaction
    const userTags = userInteractions.reduce((tags, interaction) => {
      if (interaction.tags) {
        tags = tags.concat(interaction.tags);
      }
      return tags;
    }, []);

    // just the unique id of the tag
    const TagsId = [
      // @ts-ignore
      ...new Set(userTags.map((tag: any) => tag._id)),
    ];

    const query: FilterQuery<typeof Question> = {
      $and: [{ tags: { $in: TagsId } }, { author: { $ne: user._id } }],
    };

    if (searchQuery) {
      query.$or = [
        { title: { $regex: new RegExp(searchQuery, "i") } },
        { content: { $regex: new RegExp(searchQuery, "i") } },
      ];
    }

    const skip = (page - 1) * pageSize; // skip the previous items as we get new items every time

    const recommendedQuestions = await Question.find(query)
      .populate({ path: "tags", model: Tag })
      .populate({ path: "author", model: User })
      .skip(skip)
      .limit(pageSize);

    const totalQuestions = await Question.countDocuments(query);

    const isNext = totalQuestions > skip + recommendedQuestions.length;

    return { questions: recommendedQuestions, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
