import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ShieldCheckIcon, 
  EyeSlashIcon, 
  MicrophoneIcon, 
  ClockIcon, 
  LockClosedIcon, 
  UserGroupIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Natural Roleplaying',
    description: 'Our AI smoothly roleplays as everyday services — a pizza place, tech support, or your boss — creating believable conversations that extract critical information.',
    icon: EyeSlashIcon,
  },
  {
    name: 'Contextual Intelligence',
    description: 'Cover recognizes urgency in your voice and conversation, identifying background sounds like breaking glass, gunshots, or alarms.',
    icon: MicrophoneIcon,
  },
  {
    name: 'Instant 911 Integration',
    description: 'While maintaining the roleplay cover, all emergency details are simultaneously relayed to 911 dispatchers in real-time.',
    icon: ClockIcon,
  },
  {
    name: 'Private & Secure',
    description: 'End-to-end encryption protects your call, with emergency data only shared with official response services.',
    icon: LockClosedIcon,
  },
  {
    name: 'Multiple Conversation Styles',
    description: 'Choose from various realistic personas that can adapt their conversation style to your specific emergency scenario.',
    icon: UserGroupIcon,
  },
  {
    name: '24/7 Emergency Access',
    description: "One simple hotline number connects you to Cover's roleplaying AI anytime, anywhere, with no app installation required.",
    icon: ShieldCheckIcon,
  },
];

export default function Features() {
  return (
    <div id="features" className="bg-white dark:bg-dark-300">
      <div className="container-custom section">
        <div className="text-center">
          <motion.h2 
            className="heading-2 text-gray-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Undercover Emergency Technology
          </motion.h2>
          <motion.p 
            className="mt-4 max-w-3xl mx-auto text-xl text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            AI-powered roleplaying designed to help you get emergency assistance without alerting those around you
          </motion.p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-y-12 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div 
                key={feature.name} 
                className="group relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.05 * index }}
              >
                <div className="relative pb-12">
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/40 transition-colors duration-200">
                    <feature.icon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <div className="mt-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {feature.name}
                    </h3>
                    <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        <motion.div 
          className="mt-16 sm:mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 shadow-xl">
            <div className="px-6 py-12 sm:px-12 sm:py-16 lg:flex lg:items-center lg:py-20 lg:pl-16 lg:pr-20">
              <div className="lg:w-0 lg:flex-1">
                <h3 className="text-3xl font-bold tracking-tight text-white">
                  Experience the emergency roleplay
                </h3>
                <p className="mt-4 max-w-3xl text-lg text-primary-100">
                  Try our interactive demo to see how Cover disguises emergency calls as everyday conversations. See how the AI maintains a natural roleplay while detecting emergencies.
                </p>
              </div>
              <div className="mt-12 sm:mt-16 lg:mt-0 lg:ml-8 lg:flex-shrink-0">
                <div className="sm:flex sm:flex-col sm:items-center lg:items-start">
                  <div className="sm:flex space-x-4">
                    <Link
                      to="/register"
                      className="flex items-center justify-center rounded-md border border-white border-opacity-25 bg-transparent px-6 py-3 text-base font-medium text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-500"
                    >
                      Create Account
                    </Link>
                  </div>
                  <p className="mt-3 text-sm text-primary-100 text-center sm:text-left">
                    Create an account for full access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 