import { useState } from 'react';
import { motion } from 'framer-motion';
import { Disclosure, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: "How does Cover work?",
    answer: "Cover is an AI-powered emergency hotline that roleplays as everyday services. Simply call our hotline, put your phone on speaker, and our AI will pretend to be a pizza place, tech support, or another service. Through this natural conversation, Cover extracts critical information about your emergency without alerting others around you. Your location, the nature of the emergency, and even background noises are analyzed and simultaneously transmitted to 911 dispatchers."
  },
  {
    question: "When would I use Cover instead of calling 911 directly?",
    answer: "Use Cover when making a direct 911 call might escalate the danger. For example, during a home invasion, domestic violence situation, kidnapping, or active shooter event, the perpetrator might react violently if they hear you calling emergency services. Cover's roleplaying creates a believable cover story while still getting you the help you need."
  },
  {
    question: "Is there an app I need to download?",
    answer: "No, Cover doesn't require an app. Simply call our hotline number from any phone and put it on speaker. The roleplaying conversation begins immediately, with no setup required. This ensures that in an emergency, you can access help instantly without needing to install anything beforehand."
  },
  {
    question: "How does Cover extract emergency information through roleplaying?",
    answer: "Cover uses advanced conversational AI to lead natural-sounding discussions. When you call, our AI might ask things like 'What's your delivery address?' or 'Can you describe the issue you're having?' These seemingly normal questions help gather your location and emergency details. The AI also analyzes voice stress patterns and background sounds, all while maintaining its roleplay character."
  },
  {
    question: "What types of personas can Cover roleplay as?",
    answer: "Cover can instantly adopt several convincing personas, including: a pizza delivery service, a technical support agent, your boss or colleague, a friend checking in, a ride-sharing driver, or a customer service representative. Each persona uses natural language patterns appropriate to their role while strategically gathering emergency information."
  },
  {
    question: "How accurate is Cover's emergency detection during roleplaying?",
    answer: "Cover maintains a 99.7% accuracy rate while roleplaying. Our system is trained to interpret subtle cues in conversation, background noises, and voice stress patterns, all without breaking character. The AI can detect signs of various emergencies including violence, medical issues, fires, and intrusions, transmitting this data to emergency services."
  },
  {
    question: "Is my conversation with Cover secure even while it's roleplaying?",
    answer: "Yes, all Cover conversations are protected with end-to-end encryption. While the emergency-relevant details are transmitted to 911 dispatchers, the full conversation remains private. After your emergency is resolved, conversation data is securely deleted according to strict privacy protocols."
  },
];

export default function FAQ() {
  return (
    <div id="faq" className="bg-gray-50 dark:bg-dark-200">
      <div className="container-custom section">
        <div className="text-center">
          <motion.h2 
            className="heading-2 text-gray-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p 
            className="mt-4 max-w-3xl mx-auto text-xl text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Everything you need to know about Cover's roleplaying emergency service
          </motion.p>
        </div>

        <motion.div 
          className="mt-16 max-w-3xl mx-auto divide-y divide-gray-200 dark:divide-gray-700"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {faqs.map((faq, index) => (
            <Disclosure as="div" key={index} className="py-6">
              {({ open }) => (
                <>
                  <dt className="text-lg">
                    <Disclosure.Button className="text-left w-full flex justify-between items-center focus:outline-none">
                      <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                      <span className="ml-6 h-7 flex items-center">
                        <ChevronDownIcon
                          className={`${open ? '-rotate-180' : 'rotate-0'} h-6 w-6 text-primary-600 dark:text-primary-400 transition-transform duration-200`}
                          aria-hidden="true"
                        />
                      </span>
                    </Disclosure.Button>
                  </dt>
                  <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Disclosure.Panel as="dd" className="mt-2 pr-12">
                      <p className="text-base text-gray-600 dark:text-gray-400">{faq.answer}</p>
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          ))}
        </motion.div>

        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-gray-600 dark:text-gray-300">
            Have questions about our roleplaying emergency service?
          </p>
          <div className="mt-6">
            <a href="mailto:contact@coverai.com" className="btn btn-primary">
              Contact Us
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 