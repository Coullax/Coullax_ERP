'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  HelpCircle,
  FileText,
  MessageCircle,
  Book,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
  category: string
}

interface PolicyItem {
  title: string
  description: string
  icon: any
  content: string[]
}

const faqs: FAQItem[] = [
  {
    question: 'How do I request time off?',
    answer: 'Navigate to the Requests page from the sidebar, click "New Request", select "Leave" as the request type, fill in the dates and reason, then submit. Your manager will be notified and you\'ll receive a notification once it\'s approved or rejected.',
    category: 'Leave & Attendance'
  },
  {
    question: 'How do I update my profile information?',
    answer: 'Go to your Profile page from the sidebar. You can update your basic information, add education details, skills, and upload a profile picture. Make sure to save your changes.',
    category: 'Profile'
  },
  {
    question: 'How do I upload documents?',
    answer: 'Navigate to the Documents page and click "Upload Document". You can drag and drop files or browse to select them. Add a title, description, category, and tags to make documents easier to find. You can also mark documents as public if they should be visible to all employees.',
    category: 'Documents'
  },
  {
    question: 'Can I request documents from admin?',
    answer: 'Yes! On the Documents page, click "Request Document", select the type of document you need (like paysheet, salary slip, etc.), provide a title and description, then submit. Admins will be notified and you\'ll receive the document when it\'s ready.',
    category: 'Documents'
  },
  {
    question: 'How do I check my attendance records?',
    answer: 'Go to the Attendance page to view your check-in/check-out history, attendance statistics, and any regularization requests. You can also export your attendance data.',
    category: 'Leave & Attendance'
  },
  {
    question: 'What should I do if I forgot to check in/out?',
    answer: 'Submit an Attendance Regularization request from the Requests page. Provide the date, requested time, and reason for the regularization. Your manager will review and approve it.',
    category: 'Leave & Attendance'
  },
  {
    question: 'How do I add events to my calendar?',
    answer: 'Go to the Calendar page and click on any date to create a new event. Fill in the event details including title, time, location, and whether it\'s an all-day event. You can also sync with Google Calendar if configured.',
    category: 'Calendar'
  },
  {
    question: 'How do I manage notification preferences?',
    answer: 'Navigate to Notifications and click "Preferences". You can enable/disable email and push notifications, and choose which types of notifications you want to receive (leave updates, attendance alerts, meeting reminders, etc.).',
    category: 'Settings'
  },
  {
    question: 'Who can I contact for technical support?',
    answer: 'You can contact the IT support team at support@coullax.com or call +1-555-0123. For urgent issues, use the live chat feature available on this Help Center page.',
    category: 'Support'
  },
  {
    question: 'How secure is my data?',
    answer: 'All data is encrypted in transit and at rest. We use industry-standard security practices including role-based access controls, regular security audits, and comply with relevant data protection regulations.',
    category: 'Security'
  }
]

const policies: PolicyItem[] = [
  {
    title: 'Leave Policy',
    description: 'Guidelines for requesting and managing time off',
    icon: Clock,
    content: [
      'Employees are entitled to 15 days of paid annual leave per year',
      'Sick leave requires advance notification when possible',
      'Leave requests should be submitted at least 2 weeks in advance',
      'Emergency leave can be applied retrospectively with manager approval',
      'Unused leave may be carried forward up to 5 days to the next year'
    ]
  },
  {
    title: 'Attendance Policy',
    description: 'Work hours and attendance requirements',
    icon: Users,
    content: [
      'Standard work hours: 9:00 AM to 6:00 PM, Monday to Friday',
      'Employees must check in and out daily',
      'Late arrivals beyond 15 minutes require explanation',
      'Attendance regularization requests must be submitted within 48 hours',
      'Consistent attendance is important for performance reviews'
    ]
  },
  {
    title: 'Document Security',
    description: 'How we protect your documents and data',
    icon: Shield,
    content: [
      'All documents are stored securely with encryption',
      'Access is controlled based on permissions and roles',
      'Documents can be marked as private or public',
      'Version history is maintained for all documents',
      'Regular backups ensure data is never lost'
    ]
  },
  {
    title: 'Code of Conduct',
    description: 'Expected behavior and professional standards',
    icon: FileText,
    content: [
      'Treat all colleagues with respect and professionalism',
      'Maintain confidentiality of company and employee information',
      'Report any violations or concerns to HR immediately',
      'Use company resources responsibly and ethically',
      'Promote a diverse and inclusive workplace'
    ]
  }
]

const troubleshootingGuides = [
  {
    title: 'Cannot log in to the system',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-100',
    steps: [
      'Verify your email and password are correct',
      'Clear your browser cache and cookies',
      'Try using an incognito/private browsing window',
      'Check if Caps Lock is on',
      'Contact IT support if issue persists'
    ]
  },
  {
    title: 'Document upload fails',
    icon: AlertTriangle,
    color: 'text-orange-600 bg-orange-100',
    steps: [
      'Check file size is under 50MB',
      'Ensure file type is supported (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG)',
      'Verify you have stable internet connection',
      'Try uploading a smaller file first',
      'Contact support if specific file fails repeatedly'
    ]
  },
  {
    title: 'Not receiving notifications',
    icon: Info,
    color: 'text-blue-600 bg-blue-100',
    steps: [
      'Check notification preferences in Settings',
      'Ensure email notifications are enabled',
      'Check your spam/junk folder',
      'Verify browser notification permissions',
      'Update your notification preferences and test again'
    ]
  },
  {
    title: 'Calendar sync issues',
    icon: Info,
    color: 'text-purple-600 bg-purple-100',
    steps: [
      'Verify Google Calendar integration is authorized',
      'Check if the correct Google account is connected',
      'Try disconnecting and reconnecting the integration',
      'Ensure calendar permissions are granted',
      'Wait a few minutes for sync to complete'
    ]
  }
]

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null)

  const filteredFAQs = faqs.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const faqCategories = Array.from(new Set(faqs.map(faq => faq.category)))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3">Help Center</h1>
        <p className="text-gray-500 text-lg">
          Find answers, learn about policies, and get the support you need
        </p>
      </div>

      {/* Search */}
      <Card className="p-6 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search for help articles, FAQs, policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <Book className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold mb-2">FAQs</h3>
          <p className="text-sm text-gray-500">Common questions answered</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <FileText className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold mb-2">Policies</h3>
          <p className="text-sm text-gray-500">Company policies & guidelines</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <AlertTriangle className="w-8 h-8 text-orange-600 mb-3" />
          <h3 className="font-semibold mb-2">Troubleshooting</h3>
          <p className="text-sm text-gray-500">Fix common issues</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <MessageCircle className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold mb-2">Contact Support</h3>
          <p className="text-sm text-gray-500">Get personalized help</p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <Book className="w-4 h-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="troubleshooting" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Troubleshooting
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Support
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {faqCategories.map(category => (
                <Badge key={category} variant="secondary" className="cursor-pointer">
                  {category}
                </Badge>
              ))}
            </div>

            <div className="space-y-3">
              {filteredFAQs.length === 0 ? (
                <Card className="p-8 text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No FAQs found matching your search</p>
                </Card>
              ) : (
                filteredFAQs.map((faq, index) => (
                  <Card key={index} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                      className="w-full p-5 text-left hover:bg-gray-50 transition-colors flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{faq.question}</h3>
                          <Badge variant="outline" className="text-xs">
                            {faq.category}
                          </Badge>
                        </div>
                      </div>
                      {expandedFAQ === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFAQ === index && (
                      <div className="px-5 pb-5 pt-0 text-gray-600">
                        {faq.answer}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {policies.map((policy, index) => {
                const Icon = policy.icon
                return (
                  <Card key={index} className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{policy.title}</h3>
                        <p className="text-sm text-gray-500">{policy.description}</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {policy.content.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshooting" className="mt-6 space-y-4">
            {troubleshootingGuides.map((guide, index) => {
              const Icon = guide.icon
              return (
                <Card key={index} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedGuide(expandedGuide === index ? null : index)}
                    className="w-full p-5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', guide.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold">{guide.title}</h3>
                    </div>
                    {expandedGuide === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {expandedGuide === index && (
                    <div className="px-5 pb-5 pt-0">
                      <ol className="space-y-2">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                              {idx + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Card>
              )
            })}
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Email Support</h3>
                    <p className="text-sm text-gray-500">Get help via email</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Send us your questions or issues and we'll respond within 24 hours.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:support@coullax.com">
                    <Mail className="w-4 h-4 mr-2" />
                    support@coullax.com
                  </a>
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Phone Support</h3>
                    <p className="text-sm text-gray-500">Talk to our team</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Call us for immediate assistance during business hours (9 AM - 6 PM).
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="tel:+15550123">
                    <Phone className="w-4 h-4 mr-2" />
                    +1-555-0123
                  </a>
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Live Chat</h3>
                    <p className="text-sm text-gray-500">Chat with support</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Get instant help through our live chat feature.
                </p>
                <Button className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Chat
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Documentation</h3>
                    <p className="text-sm text-gray-500">Detailed guides</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Access comprehensive documentation and user guides.
                </p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Docs
                </Button>
              </Card>
            </div>

            {/* Additional Resources */}
            <Card className="p-6 mt-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="font-semibold mb-3">Still need help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                If you can't find what you're looking for, our support team is here to help.
                You can also submit a support ticket and we'll get back to you as soon as possible.
              </p>
              <Button>
                Submit Support Ticket
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
