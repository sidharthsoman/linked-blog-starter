import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import { getPostBySlug, getAllPosts, getLinksMapping } from '../lib/api'
import { markdownToHtml } from '../lib/markdownToHtml'
import type PostType from '../interfaces/post'
import path from 'path'
import PostSingle from '../components/blog/post-single'
import Layout from '../components/misc/layout'
import { NextSeo } from 'next-seo'
import { ChatOpenAI } from "@langchain/openai";
import Modal from '../components/misc/modal'
import { useState } from 'react'

type Items = {
  title: string,
  excerpt: string,
}

type Props = {
  post: PostType
  slug: string
  backlinks: { [k: string]: Items }
}


const getQuestion = async (paragraph) => {
  function parseQuizResponse(response) {
    const lines = response.split("\n");
    
    const question = lines.find((line) => line.startsWith("Question:"))?.replace("Question: ", "").trim();
    const choices = {
      A: lines.find((line) => line.startsWith("A)"))?.replace("A) ", "").trim(),
      B: lines.find((line) => line.startsWith("B)"))?.replace("B) ", "").trim(),
      C: lines.find((line) => line.startsWith("C)"))?.replace("C) ", "").trim(),
      D: lines.find((line) => line.startsWith("D)"))?.replace("D) ", "").trim(),
    };
    const correctAnswer = lines.find((line) => line.startsWith("Correct Answer:"))?.replace("Correct Answer: ", "").trim()?.charAt(0);
  
    return { question, choices, correctAnswer };
  }
  const prompt = `
  You are a quiz generator. I will provide a paragraph, and you will create one question based on it along with four multiple-choice answers. Ensure that:
  1. The question is relevant to the paragraph's content.
  2. One answer is correct, and the other three are plausible distractors.
  3. Indicate the correct answer explicitly.
  
  Here is the paragraph:
  "${paragraph}"
  
  Generate:
  1. The question.
  2. Four answer choices labeled A, B, C, and D.
  3. Indicate the correct answer.
  
  Output your response in this format:
  Question: <Your question>
  A) <Answer choice A>
  B) <Answer choice B>
  C) <Answer choice C>
  D) <Answer choice D>
  Correct Answer: <Correct answer label (A, B, C, or D)>
    `;
  const model = new ChatOpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPEN_AI_KEY,
    modelName: "gpt-4-1106-preview",
  });
  const response = await model.invoke(prompt);
  const parsedResponse = parseQuizResponse(response.content);
  return parsedResponse;
}



export default function Post({ post, backlinks }: Props) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [questionData, setQuestionData] = useState<{
    question: string;
    choices: {
      A: string;
      B: string;
      C: string;
      D: string;
    };
    correctAnswer: string;
  }>({
    question: "",
    choices: {
      A: "",
      B: "",
      C: "",
      D: "",
    },
    correctAnswer: "",
  });
  const openModal = async () => {
    setIsModalOpen(true);
    setIsLoadingQuestion(true);
    const newQuestionData = await getQuestion(post.content);
    setQuestionData(newQuestionData);
    setIsLoadingQuestion(false);
  }
  const closeModal = () => {
    setIsModalOpen(false);
    setQuizResult(null); // Reset quiz result when closing the modal
    setSelectedAnswer(null); // Reset the selected answer
  }
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    if (answer === questionData.correctAnswer) {
      setQuizResult("Correct!");
    } else {
      setQuizResult("Incorrect. Try again!");
    }
  };
  const router = useRouter()
  const description = post.excerpt.slice(0, 155)
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }
  const numberOrNot = !isNaN(parseInt(post.title.split(" ")[1]));
  const pageNumber = parseInt(post.title.split(" ")[1]);
  const previousPage = pageNumber == 1 ? 120 : pageNumber-1;
  const nextPage = pageNumber == 120 ? 1 : pageNumber+1
  return (
    <>
      {router.isFallback ? (
        <h1>Loading…</h1>
      ) : (
        <Layout>
          <NextSeo
            title={post.title}
            description={description}
            openGraph={{
              title: post.title,
              description,
              type: 'article',
              images: [{
                url: (post.ogImage?.url) ? post.ogImage.url : "https://fleetingnotes.app/favicon/512.png",
                width: (post.ogImage?.url) ? null: 512,
                height: (post.ogImage?.url) ? null: 512,
                type: null
              }]
            }}
          />
          <PostSingle
            title={post.title}
            content={post.content}
            date={post.date}
            author={post.author}
            backlinks={backlinks}
          />

            {numberOrNot ? <div><div className="flex justify-center mt-8">
            <button
              onClick={openModal}
              className="px-4 py-2 m-5 text-white bg-black rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Quiz Me
            </button>
          </div>

          <Modal isOpen={isModalOpen} onClose={closeModal} title="Quiz">
            {/* Conditionally render loading or actual content */}
            {isLoadingQuestion ? (
              <p>Loading...</p> // Show loading message if true
            ) : (
              <div>
                <p className="mb-4">{questionData.question}</p>

                {/* Render multiple choice options */}
                <div>
                  {Object.keys(questionData.choices).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleAnswerSelect(key)}
                      className={`block w-full px-4 py-2 mb-2 text-white rounded-md 
                        ${
                          selectedAnswer === key
                            ? key === questionData.correctAnswer
                              ? "bg-green-500"
                              : "bg-red-500"
                            : "bg-black rounded hover:bg-gray-800"
                        }`}
                    >
                      {key}: {questionData.choices[key as keyof typeof questionData.choices]}
                    </button>
                  ))}
                </div>

                {/* Display the result after an answer is selected */}
                {quizResult && <p className="mt-4 text-lg">{quizResult}</p>}
              </div>
            )}
          </Modal></div> : ""}
          {
            numberOrNot ? <div className="flex justify-center mt-8">
            <button
              onClick={() => router.push(`Page%20${previousPage}`)}
              className="px-4 py-2 m-5 text-white bg-black rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous Page
            </button>
            <button
              onClick={() => router.push(`Page%20${nextPage}`)}
              className="px-4 py-2 m-5 text-white bg-black rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Page
            </button>
          </div> :
          <div className="flex justify-center mt-8">
          <button
            onClick={() => router.push(`/Page%201`)}
            className="px-4 py-2 m-5 text-white bg-black rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start with Page 1
          </button>
          </div>

          }
        </Layout>
      )}
    </>
  )
}

type Params = {
  params: {
    slug: string[]
    backlinks: string[]
  }
}

export async function getStaticProps({ params }: Params) {
  const slug = path.join(...params.slug)
  const post = await getPostBySlug(slug, [
    'title',
    'excerpt',
    'date',
    'slug',
    'author',
    'content',
    'ogImage',
  ])
  const content = await markdownToHtml(post.content || '', slug)
  const linkMapping = await getLinksMapping()
  const backlinks = Object.keys(linkMapping).filter(k => linkMapping[k].includes(post.slug) && k !== post.slug)
  const backlinkNodes = Object.fromEntries(await Promise.all(backlinks.map(async (slug) => {
    const post = await getPostBySlug(slug, ['title', 'excerpt']);
    return [slug, post]
  })));

  return {
    props: {
      post: {
        ...post,
        content,
      },
      backlinks: backlinkNodes,
    },
  }
}

export async function getStaticPaths() {
  const posts = await getAllPosts(['slug'])
  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug.split(path.sep),
        },
      } 
    }),
    fallback: false,
  }
}
