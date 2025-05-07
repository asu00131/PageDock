
export interface LinkItem {
  id: string;
  url: string;
  title: string;
}

export interface LinkCategory {
  id: string;
  title: string;
  links: LinkItem[];
}
