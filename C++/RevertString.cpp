#include <iostream>
#include <string>
#include <vector>
#include <climits>
#include <algorithm>
using namespace std;

int main()
{
    string s = "My name is piyush";
    string newstr = "";
    while (!s.empty())
    {
        int pos = s.find(" ");
        if (pos != string::npos)
        {
            newstr = s.substr(0, pos) + " " + newstr; // newstr = my + "" --> name my --> is name my
            s = s.substr(pos + 1, s.length());        // s = name is piyush --> is piyush --> piyush
        }
        else
        {
            newstr = s + " " + newstr;
            break;
        }
    }
    cout << "Reverse string: " << newstr << endl;

    s = "Vicks yag haina";
    string smallestStr = "";
    int smallest = INT_MAX;
    while (!s.empty())
    {
        int pos = s.find(" ");
        if (pos != string::npos)
        {
            string newstring = s.substr(0, pos); // newstring = my + "" --> name my --> is name my
            s = s.substr(pos + 1, s.length());  // s = name is piyush --> is piyush --> piyush
            if(newstring.size() <= smallest){
                smallest = newstring.size();
                smallestStr = newstring;
            }
        }
        else
        {
            if(s.length() <= smallest){
                smallest = s.size();
                smallestStr = s;
            }
            break;
        }
    }

    cout << "String : " << smallestStr;
    reverse(smallestStr.begin(), smallestStr.end());
    cout << ", reverse string: " << smallestStr;
}