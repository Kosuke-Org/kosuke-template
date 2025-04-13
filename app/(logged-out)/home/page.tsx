'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300 } },
  };

  return (
    <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-geist-sans)]">
      <motion.div
        className="flex flex-col gap-6 items-center sm:items-start max-w-3xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-center sm:text-left w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.h2
            className="text-xl font-bold mb-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Kosuke Template
          </motion.h2>
          <motion.h1
            className="text-4xl font-bold mb-2"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            Welcome to Kosuke
          </motion.h1>
          <motion.p
            className="text-xl text-muted-foreground mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            The open-source vibe coding platform.{' '}
            <motion.a
              href="https://github.com/filopedraz/kosuke-core"
              className="text-primary underline underline-offset-4 hover:text-primary/90"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              GitHub
            </motion.a>
          </motion.p>
          <motion.p
            className="text-lg mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Start typing what you want to build...
          </motion.p>

          <motion.div
            className="text-left border border-border rounded-lg p-4 bg-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              delay: 1,
              stiffness: 100,
            }}
            whileHover={{ boxShadow: '0px 5px 15px rgba(0,0,0,0.1)' }}
          >
            <motion.h2
              className="font-semibold mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              Here the Kosuke supported features:
            </motion.h2>
            <motion.ul className="space-y-2" variants={container} initial="hidden" animate="show">
              <motion.li className="flex items-start" variants={item}>
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                </motion.div>
                <span>Easy customization</span>
              </motion.li>
              <motion.li className="flex items-start" variants={item}>
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                </motion.div>
                <span>Lightning fast</span>
              </motion.li>
              <motion.li className="flex items-start" variants={item}>
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                </motion.div>
                <span>Reusable components</span>
              </motion.li>
              <motion.li className="flex items-start" variants={item}>
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                </motion.div>
                <span>Modern stack composed of Next 15, React 19, Shadcn UI, and Tailwind</span>
              </motion.li>
              <motion.li className="flex items-start" variants={item}>
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Circle className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" />
                </motion.div>
                <span>Backend support with Postgres db, Drizzle ORM, and Next.js APIs</span>
              </motion.li>
            </motion.ul>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
