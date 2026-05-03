import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faSpinner } from "@fortawesome/free-solid-svg-icons";
import React from "react";

interface Props {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  fileKey: number;
}

const InputImportation = React.forwardRef<HTMLInputElement, Props>(
  ({ onChange, loading, fileKey }, ref) => {
    return (
      <>
        <label
          htmlFor="file"
          className="mx-2 lg:px-8 px-3 lg:py-3 py-2 font-bold hover:cursor-pointer rounded-md bg-blue-500 !text-white shadow-xl"
        >
          {loading ? (
            <FontAwesomeIcon
              className=" lg:text-xl  mr-2 "
              icon={faSpinner}
              spin
            />
          ) : (
            <FontAwesomeIcon
              className=" lg:text-xl  mr-2 "
              icon={faCloudArrowUp}
            />
          )}
          Importation
          <input
            className="hidden"
            accept=".xlsx,.xls"
            ref={ref}
            onChange={onChange}
            type="file"
            key={fileKey}
            name="file"
            id="file"
          />
        </label>
      </>
    );
  }
);

export default InputImportation;
