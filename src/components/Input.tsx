type props = {
  type: string;
  name: string;
  id: string;
  placeholder: string;
  className: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function Input({
  type = "text",
  name = "",
  id = "",
  placeholder = "",
  className = "",
  value = "",
  onChange = () => {},
}: props) {
  return (
    <input
      type={type}
      name={name}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`block w-full px-3 lg:text-xl py-2 rounded-lg placeholder:text-gray-500 bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${className}`}
    />
  );
}
