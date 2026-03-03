source "https://rubygems.org"
gem "jekyll", "~> 4.4.1"
gem "logger", "~> 1.5"
# Security updates for vulnerable gems
gem "rack", ">= 3.1.16"
gem "webrick", ">= 1.9.1" 
gem "rexml", ">= 3.4.1"
gem "google-protobuf", ">= 4.30.2"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-seo-tag", "~> 2.8"
  gem "jekyll-admin"
  gem "jekyll-toc"
end

platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]
