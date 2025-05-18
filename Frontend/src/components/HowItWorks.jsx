import { motion } from 'framer-motion';
import { PhoneIcon, EyeSlashIcon, ArrowPathIcon, BoltIcon } from '@heroicons/react/24/outline';

const steps = [
  {
    id: 1,
    name: 'Call Cover Hotline',
    description: 'Call our emergency hotline and put your phone on speaker mode so the conversation can be heard.',
    icon: PhoneIcon,
  },
  {
    id: 2,
    name: 'Natural Conversation',
    description: 'Our AI roleplays as a pizza place, boss, friend, or another persona, leading a natural conversation to gather key information.',
    icon: EyeSlashIcon,
  },
  {
    id: 3,
    name: 'Background Analysis',
    description: 'While you talk, Cover identifies location details, emergency type, and background noises (gunshots, breaking glass, fire alarms).',
    icon: ArrowPathIcon,
  },
  {
    id: 4,
    name: 'Real-time 911 Relay',
    description: 'Critical information is instantly transmitted to 911 dispatchers who send appropriate help to your location.',
    icon: BoltIcon,
  },
];

export default function HowItWorks() {
  return (
    <div id="how-it-works" className="relative bg-gray-50 dark:bg-dark-200 overflow-hidden">
      <div className="container-custom section">
        <div className="text-center">
          <motion.h2 
            className="heading-2 text-gray-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            How Cover Works
          </motion.h2>
          <motion.p 
            className="mt-4 max-w-3xl mx-auto text-xl text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Our undercover AI roleplays natural conversations to extract emergency information when direct 911 calls aren't possible
          </motion.p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-y-16 md:grid-cols-2 lg:grid-cols-4 md:gap-x-6 lg:gap-x-8">
            {steps.map((step, index) => (
              <motion.div 
                key={step.id} 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <div className="relative">
                  <div className="flex items-center justify-center mx-auto h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    <step.icon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full h-0.5 w-16 bg-gradient-to-r from-primary-500 to-primary-300 dark:from-primary-700 dark:to-primary-500"></div>
                  )}
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">{step.name}</h3>
                <p className="mt-2 text-base text-gray-600 dark:text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
        
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-8 sm:p-10 sm:pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Why Choose Cover?</h3>
                  <p className="mt-4 text-gray-600 dark:text-gray-300">
                    Cover's roleplaying AI creates natural, realistic conversations for situations where a direct 911 call could put you in danger:
                  </p>
                  <ul className="mt-6 space-y-4 text-gray-600 dark:text-gray-300">
                    <li className="flex">
                      <svg className="flex-shrink-0 h-6 w-6 text-primary-600 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3">Domestic violence situations</span>
                    </li>
                    <li className="flex">
                      <svg className="flex-shrink-0 h-6 w-6 text-primary-600 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3">Kidnapping or hostage scenarios</span>
                    </li>
                    <li className="flex">
                      <svg className="flex-shrink-0 h-6 w-6 text-primary-600 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3">Home invasions</span>
                    </li>
                    <li className="flex">
                      <svg className="flex-shrink-0 h-6 w-6 text-primary-600 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3">Public active shooter events</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-dark-300 p-6 rounded-xl shadow-md">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Conversation Analysis</h4>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    While roleplaying, Cover extracts:
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400 mr-2"></div>
                      <span>Your location from casual mentions</span>
                    </li>
                    <li className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400 mr-2"></div>
                      <span>Danger clues from your word choice</span>
                    </li>
                    <li className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400 mr-2"></div>
                      <span>Emergency type from background sounds</span>
                    </li>
                    <li className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400 mr-2"></div>
                      <span>Threat severity from voice analysis</span>
                    </li>
                  </ul>
                  <div className="mt-6 flex items-center">
                    <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <p className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">99.7% accuracy</span> in our emergency detection system
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 