import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-gray-50 py-8 mt-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link
              href="/"
              className="text-primary font-heading font-bold text-xl">
              Interviewly
            </Link>
          </div>
          <div className="flex space-x-6">
            <Link
              href="#"
              className="text-gray-600 hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-gray-600 hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-gray-600 hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
          <div className="mt-4 md:mt-0 text-gray-500">
            © {new Date().getFullYear()} Interviewly. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
